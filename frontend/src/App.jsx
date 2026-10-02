import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { api } from "./api.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const emergencyTypes = [
  ["medical", "Medical"],
  ["fire", "Fire"],
  ["police", "Police"],
  ["accident", "Accident"],
  ["women-safety", "Women Safety"]
];

function MapAutoCenter({ point }) {
  const map = useMap();
  useEffect(() => { if (point) map.setView(point, 15); }, [point, map]);
  return null;
}

function markerIcon(status) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="marker-pin ${status === "Resolved" ? "resolved" : ""}">SOS</div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [alerts, setAlerts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "user@demo.com", password: "User@123" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [emergencyType, setEmergencyType] = useState("medical");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);

  const isResponder = user && (user.role === "responder" || user.role === "admin");

  async function refresh() {
    if (!user) return;
    try {
      const [a, c] = await Promise.all([api.alerts(), api.contacts()]);
      setAlerts(a.alerts);
      setContacts(c.contacts);
    } catch (e) { setMessage(e.message); }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api.me().then(r => { setUser(r.user); setScreen("dashboard"); }).catch(() => localStorage.clear());
  }, []);

  useEffect(() => { refresh(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL);
    socket.on("alert:new", a => setAlerts(prev => [a, ...prev.filter(x => x.id !== a.id)]));
    socket.on("alert:updated", a => setAlerts(prev => prev.map(x => x.id === a.id ? a : x)));
    return () => socket.disconnect();
  }, [user]);

  async function login(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await api.login(loginForm.email, loginForm.password);
      localStorage.setItem("token", r.token); setUser(r.user); setScreen("dashboard");
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  async function register(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      await api.register(registerForm);
      setMessage("Registration successful. Please login.");
      setScreen("login");
      setLoginForm({ email: registerForm.email, password: registerForm.password });
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  function logout() {
    localStorage.clear(); setUser(null); setAlerts([]); setContacts([]); setScreen("login");
  }

  function getGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation is not supported by this browser."));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
        e => reject(new Error(`GPS error: ${e.message}`)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  async function sendSOS() {
    setBusy(true); setMessage("");
    try {
      const gps = await getGPS();
      setLocation([gps.latitude, gps.longitude]);
      const result = await api.createAlert({ ...gps, type: emergencyType, note, offlineQueued: false });
      setAlerts(prev => [result.alert, ...prev.filter(x => x.id !== result.alert.id)]);
      setMessage(`SOS sent successfully. Alert ID: ${result.alert.id}`);
    } catch (e) {
      // Offline fallback: save a queue entry in the browser.
      try {
        const gps = location ? { latitude: location[0], longitude: location[1], accuracy: null } : await getGPS();
        const queue = JSON.parse(localStorage.getItem("sosQueue") || "[]");
        queue.push({ ...gps, type: emergencyType, note, offlineQueued: true, queuedAt: new Date().toISOString() });
        localStorage.setItem("sosQueue", JSON.stringify(queue));
        setMessage("Network unavailable. SOS has been queued locally and can be synced when connection returns.");
      } catch (gpsError) { setMessage(gpsError.message); }
    } finally { setBusy(false); }
  }

  async function syncQueue() {
    const queue = JSON.parse(localStorage.getItem("sosQueue") || "[]");
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      try { await api.createAlert(item); } catch { remaining.push(item); }
    }
    localStorage.setItem("sosQueue", JSON.stringify(remaining));
    setMessage(remaining.length ? `${remaining.length} queued SOS item(s) still waiting.` : "Offline SOS queue synced.");
    refresh();
  }

  useEffect(() => {
    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, [user]);

  async function addContact(e) {
    e.preventDefault();
    try {
      await api.addContact(contactForm);
      setContactForm({ name: "", phone: "", email: "", relationship: "" });
      setMessage("Emergency contact added.");
      refresh();
    } catch (e) { setMessage(e.message); }
  }

  async function updateStatus(id, status) {
    try { await api.updateAlert(id, { status }); refresh(); }
    catch (e) { setMessage(e.message); }
  }

  if (!user && screen === "register") return (
    <AuthCard title="Create account">
      <form onSubmit={register}>
        {["name","email","phone","password"].map(k => <input key={k} required={k !== "phone"} type={k === "password" ? "password" : k === "email" ? "email" : "text"} placeholder={k[0].toUpperCase()+k.slice(1)} value={registerForm[k]} onChange={e => setRegisterForm({...registerForm,[k]:e.target.value})} />)}
        <button disabled={busy}>Register</button>
      </form>
      <button className="link" onClick={() => setScreen("login")}>Already have an account? Login</button>
      {message && <p className="message">{message}</p>}
    </AuthCard>
  );

  if (!user) return (
    <AuthCard title="Emergency Alert & Assistance">
      <p className="muted">Cloud-based SOS and responder coordination system</p>
      <form onSubmit={login}>
        <input type="email" required placeholder="Email" value={loginForm.email} onChange={e => setLoginForm({...loginForm,email:e.target.value})} />
        <input type="password" required placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm,password:e.target.value})} />
        <button disabled={busy}>Login</button>
      </form>
      <div className="demo-box">Demo: user@demo.com / User@123<br/>Responder: responder@demo.com / Responder@123<br/>Admin: admin@demo.com / Admin@123</div>
      <button className="link" onClick={() => setScreen("register")}>Create new user account</button>
      {message && <p className="message">{message}</p>}
    </AuthCard>
  );

  const center = location || (alerts[0] ? [alerts[0].latitude, alerts[0].longitude] : [10.3673, 77.9803]);
  const activeAlerts = alerts.filter(a => a.status !== "Resolved");

  return (
    <div className="app">
      <header>
        <div><h1>🚨 Emergency Alert</h1><small>{user.name} · {user.role}</small></div>
        <button className="secondary" onClick={logout}>Logout</button>
      </header>

      {message && <div className="toast">{message}</div>}

      <main>
        {!isResponder ? (
          <section className="grid">
            <div className="card sos-card">
              <h2>One-Click SOS</h2>
              <p>Select emergency type and press SOS. Your browser GPS location is captured.</p>
              <div className="type-grid">{emergencyTypes.map(([v,l]) => <button key={v} className={emergencyType===v?"selected":""} onClick={()=>setEmergencyType(v)}>{l}</button>)}</div>
              <textarea placeholder="Optional note" value={note} onChange={e=>setNote(e.target.value)} />
              <button className="sos" onClick={sendSOS} disabled={busy}>🚨 SEND SOS</button>
              <button className="secondary" onClick={syncQueue}>Sync Offline SOS Queue</button>
            </div>

            <div className="card">
              <h2>Emergency Contacts</h2>
              <form onSubmit={addContact} className="compact-form">
                <input required placeholder="Name" value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})}/>
                <input placeholder="Phone (+91...)" value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})}/>
                <input type="email" placeholder="Email" value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})}/>
                <input placeholder="Relationship" value={contactForm.relationship} onChange={e=>setContactForm({...contactForm,relationship:e.target.value})}/>
                <button>Add Contact</button>
              </form>
              <ul>{contacts.map(c=><li key={c.id}><b>{c.name}</b> · {c.relationship}<br/>{c.phone || c.email}</li>)}</ul>
            </div>
          </section>
        ) : null}

        <section className="card">
          <div className="section-title"><h2>{isResponder ? "Responder / Admin Dashboard" : "My Alert History"}</h2><span>{activeAlerts.length} active</span></div>
          <div className="map-wrap">
            <MapContainer center={center} zoom={13} scrollWheelZoom>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapAutoCenter point={location}/>
              {alerts.map(a => <Marker key={a.id} position={[a.latitude,a.longitude]} icon={markerIcon(a.status)}>
                <Popup><b>{a.type}</b><br/>{a.userName}<br/>Status: {a.status}<br/>{a.createdAt}<br/>
                  {isResponder && a.status !== "Resolved" && <div className="popup-buttons">{["Received","Dispatched","Resolved"].map(s=><button key={s} onClick={()=>updateStatus(a.id,s)}>{s}</button>)}</div>}
                </Popup>
              </Marker>)}
            </MapContainer>
          </div>
          <div className="alerts">
            {alerts.map(a => <article className="alert-row" key={a.id}>
              <div><b>🚨 {a.type.toUpperCase()}</b> · {a.status}<br/><small>{a.userName} · {new Date(a.createdAt).toLocaleString()}</small></div>
              <div>{a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</div>
            </article>)}
            {!alerts.length && <p className="muted">No alerts yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function AuthCard({ title, children }) {
  return <div className="auth-page"><div className="auth-card"><div className="logo">🚨</div><h1>{title}</h1>{children}</div></div>;
}
