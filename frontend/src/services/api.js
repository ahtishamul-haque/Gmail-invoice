import axios from "axios";
const BASE = "http://localhost:5000/api/invoices";

export const authUrl = () => `${BASE}/auth`;
export const syncFromGmail = () => axios.post(`${BASE}/sync`);
export const getInvoices = () => axios.get(BASE);
