// api/submit-zapier.js
import axios from "axios";

// Vercel's handler signature (request, response)
export default async function handler(request, response) {
    // 1. Only allow POST requests
    if (request.method !== "POST") {
        response.setHeader("Allow", ["POST"]);
        return response
            .status(405)
            .json({ error: `Method ${request.method} Not Allowed` });
    }

    // 2. Get the Zapier URL from SERVER-SIDE Environment Variables
    //    (You'll set this up in Vercel's dashboard, NOT your .env file)
    const ZAPIER_URL = process.env.ZAPIER_WEBHOOK_URL;

    if (!ZAPIER_URL || ZAPIER_URL === "YOUR_ZAPIER_WEBHOOK_URL_HERE") {
        console.error("Zapier URL not configured in environment variables.");
        return response
            .status(500)
            .json({ error: "Server configuration error." });
    }

    try {
        // 3. Get the patient data from the request body sent by the form
        const patientData = request.body;

        console.log("Serverless function received data:", patientData); // Log on the server

        // 4. Make the POST request FROM THE SERVER to Zapier
        const zapierResponse = await axios.post(ZAPIER_URL, patientData, {
            headers: { "Content-Type": "application/json" },
        });

        console.log("Zapier responded:", zapierResponse.data);

        // 5. Check Zapier's response (adjust if needed based on actual response)
        if (zapierResponse.data && zapierResponse.data.status === "success") {
            // Send success back to the frontend
            return response
                .status(200)
                .json({ success: true, zapierData: zapierResponse.data });
        } else {
            // If Zapier didn't confirm success
            throw new Error(
                `Zapier did not return success status: ${JSON.stringify(
                    zapierResponse.data
                )}`
            );
        }
    } catch (error) {
        console.error(
            "Error forwarding data to Zapier:",
            error.response?.data || error.message
        );
        // Send error back to the frontend
        return response.status(500).json({ error: "Failed to submit data." });
    }
}
