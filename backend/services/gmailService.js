const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TOKEN_PATH = path.join(__dirname, "..", "token.json");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  const oAuth2Client = getOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
}

async function exchangeCodeForToken(code) {
  const oAuth2Client = getOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
}

function loadSavedClient() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  const oAuth2Client = getOAuthClient();
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

function getBody(payload) {
  let body = "";
  if (payload.parts) {
    for (const part of payload.parts) {
      if ((part.mimeType === "text/plain" || part.mimeType === "text/html") && part.body.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        body += getBody(part);
      }
    }
  } else if (payload.body && payload.body.data) {
    body += Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  return body;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseVendor(text) {
  if (!text) return "Unknown";
  const knownVendors = ["Amazon","Flipkart","Uber","Ola","Swiggy","Zomato","Paytm","Samsung","Apple","LG","Sony","OnePlus","Mi","HP","Dell"];
  const lower = text.toLowerCase();
  const found = knownVendors.find(v => lower.includes(v.toLowerCase()));
  return found || "Unknown";
}

function classifyCategory(vendor, text) {
  const s = (text || "").toLowerCase();
  if (/uber|ola/.test(s)) return "Travel";
  if (/swiggy|zomato|dominos|food|restaurant/.test(s)) return "Food";
  if (/amazon|flipkart|myntra|shop|order/.test(s)) return "Shopping";
  if (/samsung|lg|sony|apple|oneplus|mi|hp|dell/.test(s)) return "Electronics";
  if (/electricity|bill|water|gst|tax/.test(s)) return "Bills";
  return vendor || "Other";
}

function parseItems(text) {
  // Find the items section
  const itemsSectionMatch = text.match(/Items:(.*)Total Amount:/s);
  if (!itemsSectionMatch) return [];
  const itemsSection = itemsSectionMatch[1];

  // Match all items, even if not separated by newlines
  const itemRegex = /(\d+\s*\|[^|]+?\|\s*\d+\s*\|\s*\d+\s*\|\s*\d+)/g;
  const itemMatches = [];
  let match;
  while ((match = itemRegex.exec(itemsSection)) !== null) {
    itemMatches.push(match[1]);
  }
  if (!itemMatches.length) return [];

  const items = itemMatches.map(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 5) {
      return {
        itemName: parts[1],
        quantity: Number(parts[2]),
        price: Number(parts[3]),
        total: Number(parts[4])
      };
    }
    return null;
  }).filter(Boolean);

  return items;
}

function parseTotalAmount(text) {
  const match = text.match(/Total Amount[:\s]*₹?(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}

async function fetchInvoicesFromGmail(oAuth2Client, { maxResults = 25 } = {}) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(invoice OR receipt OR order)",
    maxResults
  });

  const messages = res.data.messages || [];
  const out = [];

  for (const m of messages) {
    const full = await gmail.users.messages.get({ userId: "me", id: m.id });
    const rawBody = getBody(full.data.payload) || "";
    const bodyText = stripHtml(rawBody);
    
    console.log(bodyText.substring(0, 300));

    const vendor = parseVendor(bodyText);
    const category = classifyCategory(vendor, bodyText);
    const items = parseItems(bodyText);
    const totalAmount = items.length > 0 ? items.reduce((sum, i) => sum + i.total, 0) : parseTotalAmount(bodyText);

    const emailTimestamp = full.data.internalDate ? new Date(Number(full.data.internalDate)) : new Date();

    // One invoice per email
    const invoiceCode = [
      vendor.substring(0, 3).toUpperCase(),
      emailTimestamp.getFullYear(),
      (emailTimestamp.getMonth() + 1).toString().padStart(2, "0"),
      emailTimestamp.getDate().toString().padStart(2, "0"),
      crypto.randomBytes(3).toString("hex") 
    ].join("-");

    const invoiceObj = {
      gmailId: m.id,
      invoiceCode, 
      vendor,
      items: items.length > 0
        ? items
        : [{
            itemName: vendor + " Order",
            quantity: 1,
            price: totalAmount,
            total: totalAmount
          }],
      amount: totalAmount,
      currency: "INR",
      category,
      paymentMethod: "Unknown",
      date: emailTimestamp,
      snippet: bodyText.substring(0, 200)
    };

    out.push(invoiceObj);
  }

  return out;
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  loadSavedClient,
  fetchInvoicesFromGmail,
  TOKEN_PATH
};

