// api/send-otp.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email et OTP requis." });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ImmoCI <onboarding@resend.dev>",
        to: [email],
        subject: "Votre code de vérification ImmoCI",
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#0c1f35,#163354);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
              <h1 style="margin:0;color:#e8a020;font-size:28px;font-weight:900;">🏙️ ImmoCI</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Immobilier de confiance en Côte d'Ivoire</p>
            </div>
            <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
              <h2 style="margin:0 0 12px;color:#0c1f35;font-size:20px;">Confirmez votre email</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Voici votre code de vérification. Il est valable pendant <strong>10 minutes</strong>.
              </p>
              <div style="background:#fef3dc;border:2px dashed #e8a020;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Votre code</p>
                <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:10px;color:#0c1f35;">${otp}</p>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">
                ⚠️ Ne partagez jamais ce code. ImmoCI ne vous le demandera jamais.
              </p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">
              © 2026 ImmoCI · Côte d'Ivoire
            </p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend error:", data);
      return res.status(500).json({ error: "Échec envoi email.", detail: data });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Erreur serveur.", detail: err.message });
  }
}
