import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
export async function POST(request) {
  try {
    const { email, sessionId, results } = await request.json()
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
    const deals = Array.isArray(results) ? results : []
    const dealList = deals
      .map(
        (deal, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${deal.name || deal.title || "Deal"}</td>
            <td>${deal.price || "N/A"}</td>
          </tr>
        `
      )
      .join("")
    await transporter.sendMail({
      from: `"AI Deal Finder" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your AI Deal Finder Report",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>AI Deal Finder Report</h2>

          <p>Your deal search report is ready.</p>

          ${
            sessionId
              ? `<p><strong>Session ID:</strong> ${sessionId}</p>`
              : ""
          }
          ${
            deals.length
              ? `
                <table border="1" cellpadding="10" cellspacing="0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dealList}
                  </tbody>
                </table>
              `
              : "<p>No deals found.</p>"
          }
          <p>Thanks for using AI Deal Finder.</p>
        </div>
      `,
    })
    return NextResponse.json({
      message: "Deal report sent successfully!",
      success: true,
    })
  } catch (error) {
    console.error("Email API error:", error)
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error.message,
      },
      { status: 500 }
    )
  }
}