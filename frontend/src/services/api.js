import axios from "axios";
const BASE = "/api/invoices";

export const authUrl = () => `${BASE}/auth`;
export const syncFromGmail = () => axios.post(`${BASE}/sync`);
export const getInvoices = () => axios.get(BASE);
