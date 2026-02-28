import { useEffect, useState } from "react";

export default function Laigo() {
    const [apiStatus, setApiStatus] = useState("checking...");
    const API = import.meta.env.VITE_API_URL;

    // Dummy health check for now
    useEffect(() => {
        // Replace with your real backend URL later
        fetch(`${API}/health`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(() => setApiStatus("online"))
            .catch(() => setApiStatus("offline"));
    }, []);

    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                fontFamily: "sans-serif",
                backgroundColor: "#f4f4f4",
                color: "#000",
                padding: "2rem",
                boxSizing: "border-box",
            }}
        >
            <h1>LAIGO Frontend</h1>
            <p>Backend API status: <strong>{apiStatus}</strong></p>
            <div style={{ border: "2px solid red", padding: "1rem" }}>
                <p>Next Steps:</p>
                <ul>
                    <li>Image upload pipeline</li>
                    <li>Piece quantization preview</li>
                    <li>Instruction generation</li>
                    <li>Inventory optimization</li>
                </ul>
            </div>
        </div>
    );
}