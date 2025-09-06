const express = require("express");
const dotenv = require("dotenv");
const Invoice = require("../models/Invoice");
const { fetchInvoicesFromGmail } = require("../services/gmailService");
const { google } = require("googleapis");
const Token = require("../models/Token");

dotenv.config();
const router = express.Router();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get("/auth", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  res.redirect(url);
});

router.get("/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;

    await Token.findOneAndUpdate(
      { user: email },
      { ...tokens, user: email },
      { upsert: true, new: true }
    );

    res.redirect("/");
  } catch (err) {
    console.error("OAuth2 Callback Error:", err.message);
    res.status(500).send("Auth failed");
  }
});

router.post("/sync", async (req, res) => {
  try {
    const savedTokens = await Token.findOne({ user: "me" });
    if (!savedTokens) return res.status(401).json({ success: false, error: "Gmail not connected" });

    oAuth2Client.setCredentials(savedTokens);

    const invoicesFromGmail = await fetchInvoicesFromGmail(oAuth2Client, { maxResults: 10 });

    for (const inv of invoicesFromGmail) {
      if (!inv.gmailId || !inv.date) continue;
      await Invoice.updateOne(
        { gmailId: inv.gmailId },
        inv,
        { upsert: true }
      );
    }

    res.json({ success: true, invoices: invoicesFromGmail });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ date: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


