const BASE_URL = "https://api.wagmicharge.xyz"; // your deployed backend URL

export const buyAirtime = async (data: {
  phone: string;
  serviceID: string;
  amount?: number;
  variation_code?: string;
}) => {
  const res = await fetch(`${BASE_URL}/api/airtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to buy airtime");

  return await res.json();
};
