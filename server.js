// server.js (Express)
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

// ── Auth ──
app.post('/api/auth/signup', async (req, res) => { /* hash password, insert user, send email verification */ });
app.post('/api/auth/login', async (req, res) => { /* verify credentials, set session.user */ });
app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });

// ── Artworks ──
app.get('/api/artworks', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.medium, a.image_url, a.starting_bid,
            COALESCE(MAX(b.amount), a.starting_bid) AS current_bid,
            COUNT(b.id) AS bid_count,
            a.auction_end, a.status
     FROM artworks a
     LEFT JOIN bids b ON b.artwork_id = a.id
     WHERE a.status = 'live'
     GROUP BY a.id
     ORDER BY a.auction_end ASC`
  );
  res.json(rows);
});

app.get('/api/artworks/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, ar.name AS artist,
            COALESCE(MAX(b.amount), a.starting_bid) AS current_bid,
            COUNT(b.id) AS bid_count
     FROM artworks a
     JOIN artists ar ON ar.id = a.artist_id
     LEFT JOIN bids b ON b.artwork_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, ar.name`,
    [req.params.id]
  );
  const bids = await pool.query(
    `SELECT b.amount, b.created_at, u.name AS bidder_name
     FROM bids b JOIN users u ON u.id = b.bidder_id
     WHERE b.artwork_id = $1
     ORDER BY b.created_at DESC LIMIT 20`,
    [req.params.id]
  );
  res.json({ ...rows[0], bids: bids.rows });
});

// ── Bidding ──
app.post('/api/artworks/:id/bids', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });

  const artwork = await pool.query('SELECT * FROM artworks WHERE id = $1', [req.params.id]);
  if (artwork.rows.length === 0) return res.status(404).json({ error: 'Artwork not found' });
  const art = artwork.rows[0];

  // Server-side validation
  if (art.status !== 'live') return res.status(400).json({ error: 'Auction is not live' });
  if (new Date(art.auction_end).getTime() <= Date.now()) return res.status(400).json({ error: 'Auction has closed' });

  const highest = await pool.query('SELECT MAX(amount) AS max FROM bids WHERE artwork_id = $1', [art.id]);
  const current = highest.rows[0].max || art.starting_bid;
  const amount = parseFloat(req.body.amount);

  if (!amount || amount < current + art.min_increment) return res.status(400).json({ error: 'Bid below minimum' });

  // Insert bid atomically
  const bid = await pool.query(
    'INSERT INTO bids (artwork_id, bidder_id, amount) VALUES ($1, $2, $3) RETURNING *',
    [art.id, req.session.user.id, amount]
  );

  // Update all previous bids status to 'outbid'
  await pool.query('UPDATE bids SET status = $1 WHERE artwork_id = $2 AND id != $3', ['outbid', art.id, bid.rows[0].id]);

  // Notify previous highest bidder (email/socket)
  const previousHighest = await pool.query('SELECT bidder_id FROM bids WHERE artwork_id = $1 AND amount = $2 AND id != $3', [art.id, current, bid.rows[0].id]);
  if (previousHighest.rows[0]) {
    // send outbid email
  }

  // Emit real-time update
  io.to(`artwork-${art.id}`).emit('bid:update', { current_bid: amount });

  res.json({ current_bid: amount, bid_count: parseInt(art.bid_count) + 1 });
});

// ── Auction closing (cron job) ──
async function closeEndedAuctions() {
  const ended = await pool.query(
    `UPDATE artworks SET status = 'payment_pending'
     WHERE status = 'live' AND auction_end <= now()
     RETURNING id, title`
  );
  for (const art of ended.rows) {
    const winner = await pool.query(
      'SELECT bidder_id, amount FROM bids WHERE artwork_id = $1 ORDER BY amount DESC LIMIT 1',
      [art.id]
    );
    if (winner.rows[0]) {
      await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['won', winner.rows[0].id]);
      // create payment record, send winner notification
    }
  }
}
setInterval(closeEndedAuctions, 60 * 1000);

// ── Stripe Payment ──
app.post('/api/payments/:artworkId/create-intent', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  const artwork = await pool.query('SELECT * FROM artworks WHERE id = $1', [req.params.artworkId]);
  if (artwork.rows[0].status !== 'payment_pending') return res.status(400).json({ error: 'Artwork not ready for payment' });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(artwork.rows[0].current_bid * 100),
    currency: 'usd',
    metadata: { artwork_id: artwork.rows[0].id, user_id: req.session.user.id }
  });

  await pool.query('INSERT INTO payments (artwork_id, winner_id, amount, stripe_payment_intent_id) VALUES ($1,$2,$3,$4)',
    [artwork.rows[0].id, req.session.user.id, artwork.rows[0].current_bid, paymentIntent.id]);

  res.json({ clientSecret: paymentIntent.client_secret });
});

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type === 'payment_intent.succeeded') {
    // mark payment paid, artwork sold, record financial allocation, notify admin/team
  }
  res.json({ received: true });
});

// ── Admin routes ──
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const stats = await pool.query(`SELECT
    (SELECT COUNT(*) FROM artworks) AS total_artworks,
    (SELECT COUNT(*) FROM artworks WHERE status='live') AS active_auctions,
    (SELECT COUNT(*) FROM bids) AS total_bids,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='paid') AS total_sales,
    (SELECT COUNT(*) FROM payments WHERE status='pending') AS pending_payments
  `);
  res.json(stats.rows[0]);
});

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
