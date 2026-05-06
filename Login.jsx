import { useState } from "react";
import { auth } from "./firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [confirmObj, setConfirmObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOTP = async () => {
    if (phone.length !== 10) {
      setError("10 digit number daalo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, "recaptcha-container",
        { size: "invisible" }
      );
      const result = await signInWithPhoneNumber(
        auth,
        "+91" + phone,
        window.recaptchaVerifier
      );
      setConfirmObj(result);
      setStep("otp");
    } catch (err) {
      setError("OTP nahi gaya: " + err.message);
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError("6 digit OTP daalo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await confirmObj.confirm(otp);
      onLogin();
    } catch (err) {
      setError("Galat OTP hai!");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a1a0a",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "#1a2e1a", borderRadius: "20px",
        padding: "32px", width: "100%", maxWidth: "360px",
        border: "1px solid #2d5a2d"
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "48px" }}>🛒</div>
          <h1 style={{ color: "#4ade80", fontSize: "24px",
            fontWeight: "700", margin: "8px 0 4px" }}>
            Daily Basket
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Fresh groceries delivered daily
          </p>
        </div>

        {step === "phone" ? (
          <>
            <p style={{ color: "#9ca3af", fontSize: "14px",
              marginBottom: "8px" }}>
              Mobile Number
            </p>
            <div style={{ display: "flex", gap: "8px",
              marginBottom: "16px" }}>
              <div style={{
                background: "#0f1f0f", border: "1px solid #2d5a2d",
                borderRadius: "10px", padding: "12px",
                color: "#4ade80", fontWeight: "600"
              }}>+91</div>
              <input
                type="number"
                placeholder="10 digit number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  flex: 1, background: "#0f1f0f",
                  border: "1px solid #2d5a2d", borderRadius: "10px",
                  padding: "12px", color: "white",
                  fontSize: "16px", outline: "none"
                }}
              />
            </div>
            <div id="recaptcha-container"></div>
            <button onClick={sendOTP} disabled={loading}
              style={{
                width: "100%", background: "#16a34a",
                color: "white", border: "none", borderRadius: "12px",
                padding: "14px", fontSize: "16px",
                fontWeight: "600", cursor: "pointer"
              }}>
              {loading ? "Bhej raha hai..." : "OTP Bhejo 📱"}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#9ca3af", fontSize: "14px",
              marginBottom: "8px" }}>
              OTP enter karo (+91 {phone})
            </p>
            <input
              type="number"
              placeholder="6 digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              style={{
                width: "100%", background: "#0f1f0f",
                border: "1px solid #2d5a2d", borderRadius: "10px",
                padding: "12px", color: "white", fontSize: "20px",
                letterSpacing: "8px", textAlign: "center",
                outline: "none", marginBottom: "16px",
                boxSizing: "border-box"
              }}
            />
            <button onClick={verifyOTP} disabled={loading}
              style={{
                width: "100%", background: "#16a34a",
                color: "white", border: "none", borderRadius: "12px",
                padding: "14px", fontSize: "16px",
                fontWeight: "600", cursor: "pointer"
              }}>
              {loading ? "Check ho raha..." : "Login Karo ✅"}
            </button>
            <button onClick={() => setStep("phone")}
              style={{
                width: "100%", background: "transparent",
                color: "#4ade80", border: "none",
                padding: "10px", cursor: "pointer",
                fontSize: "14px", marginTop: "8px"
              }}>
              ← Number change karo
            </button>
          </>
        )}

        {error && (
          <p style={{ color: "#f87171", textAlign: "center",
            marginTop: "12px", fontSize: "14px" }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
      }
