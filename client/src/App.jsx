import { useEffect, useState } from "react";
import { api, getToken, saveToken } from "./api.js";

const navItems = [
  ["home", "Home"], ["about", "About Us"], ["quantity", "Quantity"],
  ["market", "Market Live"], ["requests", "Customer request"]
];
const demoRates = { tomato: 34, brinjal: 45, spinach: 22, banana: 42 };
const initialCheckout = { customerName: "", customerPhone: "", address: "", landmark: "" };
const money = (value) => `₹${Math.round(Number(value) || 0)}`;
const dateText = (value) => value ? new Date(value).toLocaleDateString() : "";
const sampleProductPhotos = {
  tomato: "/pictures/tomato.png",
  brinjal: "/pictures/brinjal.png",
  spinach: "/pictures/spinach.png",
  potato: "/pictures/potato.jpg"
};
const sampleProductPhoto = (name) => {
  const crop = Object.keys(sampleProductPhotos).find((item) => String(name).toLowerCase().includes(item));
  return sampleProductPhotos[crop] || "/pictures/farmer-general.png";
};

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

function AuthPanel({ role, onLogin, onRegister }) {
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setError("");
    try {
      if (registering) await onRegister(values);
      else await onLogin(values);
    } catch (issue) {
      setError(issue.message);
    }
  }

  return <section className="panel auth-panel">
    <div className="panel-heading"><div><span className="eyebrow">{role === "fpo" ? "FPO workspace" : "Farmer workspace"}</span><h2>{registering ? "Farmer registration" : "Sign in"}</h2></div></div>
    <form className="form-grid" onSubmit={submit}>
      {registering ? <>
        <Field name="name" label="Full name" required autoComplete="name" />
        <Field name="phone" label="Phone number" required type="tel" inputMode="tel" />
        <Field name="village" label="Village" required />
        <Field name="fpoName" label="FPO" defaultValue="Green Valley FPO" />
        <Field name="fpoMembershipNo" label="FPO membership number" />
        <Field name="acres" label="Land size (acres)" type="number" min="0" step="0.1" />
        <Field name="crops" label="Crops grown" />
        <Field name="landRecord" label="Land record number" />
        <Field name="password" label="Create password" type="password" minLength="4" required autoComplete="new-password" />
      </> : <>
        <Field name="identifier" label={role === "fpo" ? "FPO user ID" : "Farmer phone"} required defaultValue={role === "fpo" ? "fpo" : undefined} autoComplete="username" />
        <Field name="password" label="Password" type="password" required autoComplete="current-password" />
      </>}
      {error && <p className="form-error full-width">{error}</p>}
      <button className="button primary full-width" type="submit">{registering ? "Submit for FPO approval" : "Sign in"}</button>
    </form>
    {role === "farmer" && <button className="text-button" onClick={() => { setError(""); setRegistering(!registering); }}> {registering ? "Already registered? Sign in" : "New farmer? Register"}</button>}
    <p className="form-hint">Demo farmer: 9000000001 / 1234. FPO: fpo / admin123.</p>
  </section>;
}

function App() {
  const [view, setView] = useState("home");
  const [portal, setPortal] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem("freshfarm_language") || "en");
  const [products, setProducts] = useState([]);
  const [quantity, setQuantity] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notice, setNotice] = useState("");
  const [checkout, setCheckout] = useState(initialCheckout);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackForm, setTrackForm] = useState({ id: "", phone: "" });
  const [issueReason, setIssueReason] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [requestForm, setRequestForm] = useState({ customerName: "", phone: "", item: "", qty: "", unit: "kg", note: "" });

  const text = (english, tamil) => language === "ta" ? tamil : english;

  async function loadProducts() {
    const [productResult, quantityResult] = await Promise.all([api("/products"), api("/quantity")]);
    setProducts(productResult.products);
    setQuantity(quantityResult.quantity);
  }

  async function loadWorkspace(currentUser = user) {
    if (!currentUser) return;
    const endpoint = currentUser.role === "farmer" ? "/farmer/dashboard" : currentUser.role === "fpo" ? "/fpo/dashboard" : null;
    const [alerts, dashboard] = await Promise.all([
      api("/notifications"), endpoint ? api(endpoint) : Promise.resolve(null)
    ]);
    setNotifications(alerts.notifications);
    setWorkspace(dashboard);
  }

  useEffect(() => {
    loadProducts().catch((error) => setNotice(error.message));
    if (getToken()) {
      api("/auth/me").then(({ user: currentUser }) => setUser(currentUser)).catch(() => saveToken(null));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setNotifications([]);
      return;
    }

    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (!active || refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        await Promise.all([loadWorkspace(user), loadProducts()]);
      } catch (error) {
        if (active) setNotice(error.message);
      } finally {
        refreshing = false;
      }
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);

  async function login(values) {
    const result = await api("/auth/login", { method: "POST", body: JSON.stringify(values) });
    saveToken(result.token);
    setUser(result.user);
    setPortal(result.user.role);
    setNotice(`Welcome, ${result.user.name}.`);
  }

  async function register(values) {
    const result = await api("/auth/register", { method: "POST", body: JSON.stringify(values) });
    setNotice(result.message);
    setPortal(null);
  }

  function logout() {
    saveToken(null);
    setUser(null);
    setPortal(null);
    setNotice("You have signed out.");
  }

  async function refreshWorkspace() {
    await Promise.all([loadProducts(), loadWorkspace(user)]);
  }

  async function submitRequest(event) {
    event.preventDefault();
    try {
      const result = await api("/requests", { method: "POST", body: JSON.stringify(requestForm) });
      setNotice(result.message);
      setRequestForm({ customerName: "", phone: "", item: "", qty: "", unit: "kg", note: "" });
      if (user?.role === "farmer") await loadWorkspace(user);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function placeOrder(product, qty = 1) {
    try {
      const result = await api("/orders", { method: "POST", body: JSON.stringify({ ...checkout, productId: product._id, qty }) });
      setTrackedOrder(result.order);
      setTrackForm({ id: result.order._id, phone: checkout.customerPhone });
      setNotice(`Order placed. Your order number is ${result.order._id}.`);
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();
    try {
      const result = await api(`/orders/${encodeURIComponent(trackForm.id)}?phone=${encodeURIComponent(trackForm.phone)}`);
      setTrackedOrder(result.order);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function cancelOrder() {
    try {
      const result = await api(`/orders/${trackedOrder._id}/cancel`, { method: "POST", body: JSON.stringify({ phone: trackForm.phone, reason: "Changed my mind" }) });
      setTrackedOrder(result.order);
      setNotice("Order cancelled and stock returned.");
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function reportOrderIssue() {
    try {
      const result = await api(`/orders/${trackedOrder._id}/issues`, { method: "POST", body: JSON.stringify({ phone: trackForm.phone, reason: issueReason, note: issueNote }) });
      setTrackedOrder(result.order);
      setNotice("Your issue was sent to the FPO.");
      setIssueReason("");
      setIssueNote("");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function addProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await api("/products", { method: "POST", body: values });
      setNotice("Produce added to your listings.");
      form.reset();
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deliveryAction(order, action, details = {}) {
    try {
      await api(`/farmer/orders/${order._id}`, { method: "PATCH", body: JSON.stringify({ action, ...details }) });
      setNotice(action === "start" ? "Delivery started." : "Order status updated.");
      await loadWorkspace(user);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function farmerRequestAction(request) {
    try {
      await api(`/requests/${request._id}/status`, { method: "PATCH", body: JSON.stringify({ status: "fulfilled" }) });
      await loadWorkspace(user);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function fpoAction(path, body) {
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(body) });
      setNotice("FPO action saved.");
      await loadWorkspace(user);
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function markNotificationsRead() {
    try {
      await api("/notifications/read", { method: "PATCH" });
      await loadWorkspace(user);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function chooseView(nextView) {
    setPortal(null);
    setView(nextView);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPortal(role) {
    setPortal(role);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const unread = notifications.filter((item) => !item.read).length;

  return <div className="app-shell">
    <header className="masthead">
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); chooseView("home"); }}>
        <span className="brand-mark">FF</span><span><strong>FreshFarm</strong><small>DIRECT FROM GROWERS</small></span>
      </a>
      <div className="masthead-copy"><span className="eyebrow">Harvest, handled locally</span><p>Fresh produce, fair prices, stronger farm communities.</p></div>
      <div className="account-actions">
        <button className="button quiet" onClick={() => setLanguage(language === "en" ? "ta" : "en")}>{language === "en" ? "தமிழ்" : "English"}</button>
        {user ? <><span className="user-chip">{user.name} <small>{user.role}</small></span><button className="button quiet" onClick={logout}>Sign out</button></> : <button className="button primary" onClick={() => openPortal("farmer")}>Farmer / FPO sign in</button>}
      </div>
    </header>

    <nav className="main-nav" aria-label="Main navigation">
      {navItems.map(([id, label]) => <button key={id} className={view === id && !portal ? "nav-item active" : "nav-item"} onClick={() => chooseView(id)}>{text(label, { Home: "முகப்பு", "About Us": "எங்களைப் பற்றி", Quantity: "அளவு", "Market Live": "சந்தை விலை", "Customer request": "வாடிக்கையாளர் கோரிக்கை" }[label])}</button>)}
    </nav>

    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

    {user && notifications.length > 0 && <aside className="notification-strip">
      <div><strong>Notifications {unread > 0 && <span className="count-badge">{unread}</span>}</strong><div className="notification-list">{notifications.slice(0, 3).map((item) => <p key={item._id} className={item.read ? "read" : ""}>{item.text}</p>)}</div></div>
      {unread > 0 && <button className="text-button" onClick={markNotificationsRead}>Mark read</button>}
    </aside>}

    <main className="page-content">
      {portal ? <PortalView
        role={portal} user={user} workspace={workspace} products={products} onLogin={login} onRegister={register}
        onAddProduct={addProduct} onDelivery={deliveryAction} onRequestAction={farmerRequestAction}
        onFpoAction={fpoAction} onLogout={logout} onBack={() => setPortal(null)}
        checkout={checkout} setCheckout={setCheckout} onOrder={placeOrder} trackedOrder={trackedOrder}
        trackForm={trackForm} setTrackForm={setTrackForm} onTrack={trackOrder} onCancelOrder={cancelOrder}
        onReportIssue={reportOrderIssue} issueReason={issueReason} setIssueReason={setIssueReason}
        issueNote={issueNote} setIssueNote={setIssueNote}
      /> : <>
        {view === "home" && <HomeView onPortal={openPortal} text={text} />}
        {view === "about" && <AboutView text={text} />}
        {view === "quantity" && <QuantityView rows={quantity} text={text} />}
        {view === "market" && <MarketView products={products} text={text} />}
        {view === "requests" && <RequestsView form={requestForm} setForm={setRequestForm} onSubmit={submitRequest} requests={workspace?.requests || []} canSeeRequests={user?.role === "farmer" || user?.role === "fpo"} text={text} />}
      </>}
    </main>

    <footer className="page-footer">FreshFarm Direct <span>•</span> Locally grown, directly connected.</footer>
  </div>;
}

function HomeView({ onPortal, text }) {
  return <>
    <section className="hero-band">
      <div><span className="eyebrow light">FARM TO FAMILY</span><h1>Good food starts<br />with a fair connection.</h1><p>Discover fresh harvests from verified farmers and make local food easier to find.</p></div>
      <span className="hero-stamp">GROWN<br />NEAR YOU</span>
    </section>
    <section className="role-grid" aria-label="Choose a workspace">
      <button className="role-card customer-card" onClick={() => onPortal("customer")}><span className="role-index">01 / MARKET</span><strong>{text("Shop produce", "விளைபொருள் வாங்க")}</strong><span>Browse seasonal crops, place an order, and track delivery.</span><b>Explore produce <i>↗</i></b></button>
      <button className="role-card farmer-card" onClick={() => onPortal("farmer")}><span className="role-index">02 / GROWER</span><strong>Farmer workspace</strong><span>Manage listings, incoming orders, and customer requests.</span><b>Open farmer tools <i>↗</i></b></button>
      <button className="role-card fpo-card" onClick={() => onPortal("fpo")}><span className="role-index">03 / FPO</span><strong>FPO workspace</strong><span>Review farmer registrations and resolve order issues.</span><b>Open FPO tools <i>↗</i></b></button>
    </section>
    <div className="home-note"><span className="note-mark">F</span><p>Farmers list their harvest. Customers order directly. FPO officers help keep the marketplace trusted.</p></div>
  </>;
}

function AboutView({ text }) {
  return <section className="content-panel about-view"><span className="eyebrow">OUR PURPOSE</span><h1>{text("About FreshFarm", "FreshFarm பற்றி")}</h1><p className="lead">{text("FreshFarm Direct connects local farmers and customers without unnecessary middlemen.", "FreshFarm Direct உள்ளூர் விவசாயிகளையும் வாடிக்கையாளர்களையும் தேவையற்ற இடைத்தரகர்கள் இல்லாமல் இணைக்கிறது.")}</p><div className="about-columns"><article><span>01</span><h2>For farmers</h2><p>List available harvests, set your own prices, and manage delivery from one place.</p></article><article><span>02</span><h2>For customers</h2><p>Find produce from approved local growers and request items that are not listed yet.</p></article><article><span>03</span><h2>For FPOs</h2><p>Review applications, monitor orders, and help resolve problems fairly.</p></article></div></section>;
}

function QuantityView({ rows, text }) {
  const total = rows.reduce((sum, item) => sum + item.sold, 0);
  return <section className="content-panel"><div className="section-heading"><div><span className="eyebrow">MARKET ACTIVITY</span><h1>{text("Quantity sold", "விற்கப்பட்ட அளவு")}</h1></div><div className="metric"><strong>{total}</strong><span>units delivered</span></div></div><p className="section-note">Completed deliveries only. Cancelled and failed orders are excluded.</p>
    {rows.length ? <div className="data-table"><div className="table-head"><span>Produce</span><span>Farmer</span><span>Quantity sold</span><span>Available now</span></div>{rows.map((item) => <div className="table-row" key={item.id}><strong>{item.name}</strong><span>{item.farmer}</span><span>{item.sold} {item.unit}</span><span>{item.available} {item.unit}</span></div>)}</div> : <EmptyState title="No listings yet" text="Quantities will appear when farmers add products." />}
  </section>;
}

function MarketView({ products, text }) {
  const seen = new Set();
  const rows = products.filter((item) => { const key = `${item.name.toLowerCase()}-${item.unit}`; if (seen.has(key)) return false; seen.add(key); return true; });
  return <section className="content-panel"><div className="section-heading"><div><span className="eyebrow">PRICE BOARD</span><h1>{text("Market Live", "சந்தை விலை")}</h1></div><span className="demo-label">DEMO REFERENCE RATES</span></div><p className="section-note">Sample comparison prices only. These are not live market quotes.</p>
    {rows.length ? <div className="price-grid">{rows.map((item) => { const reference = demoRates[item.name.toLowerCase()] || Math.round(item.price * 1.12); return <article className="price-card" key={item._id}><span className="eyebrow">LOCAL PRODUCE</span><h2>{item.name}</h2><p>{item.farmer?.name || "Verified grower"} · {item.unit}</p><div><span>Platform price</span><strong>{money(item.salePrice)}<small>/{item.unit}</small></strong></div><div><span>Reference rate</span><strong className="reference-price">{money(reference)}<small>/{item.unit}</small></strong></div></article>; })}</div> : <EmptyState title="No prices available" text="Price samples will appear as farmers list produce." />}
  </section>;
}

function RequestsView({ form, setForm, onSubmit, requests, canSeeRequests, text }) {
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="request-layout"><section className="content-panel"><span className="eyebrow">WANTED BY CUSTOMERS</span><h1>{text("Request produce", "விளைபொருளைக் கோருங்கள்")}</h1><p className="lead-small">Tell local farmers what you need. Approved farmers are notified when you post.</p>
    <form className="form-grid" onSubmit={onSubmit}><Field label="Customer name" value={form.customerName} onChange={update("customerName")} required autoComplete="name" /><Field label="Phone for follow-up" type="tel" value={form.phone} onChange={update("phone")} required inputMode="tel" /><Field label="Item or crop" value={form.item} onChange={update("item")} required placeholder="e.g. Tomato" /><Field label="Quantity" type="number" min="0.1" step="0.1" value={form.qty} onChange={update("qty")} required /><label className="field"><span>Unit</span><select value={form.unit} onChange={update("unit")}><option>kg</option><option>bunch</option><option>piece</option><option>bag</option></select></label><Field label="Note (optional)" value={form.note} onChange={update("note")} /><button className="button primary full-width" type="submit">Submit customer request</button></form>
  </section><section className="content-panel request-list"><div className="section-heading"><div><span className="eyebrow">FARMER BOARD</span><h2>Open customer requests</h2></div></div>{canSeeRequests ? requests.length ? requests.map((request) => <article className="request-row" key={request._id}><div><strong>{request.item}</strong><p>{request.customerName} · {request.phone}</p><small>{request.note || "No extra details"}</small></div><b>{request.qty} {request.unit}</b></article>) : <EmptyState title="No open requests" text="New customer requests will appear here." /> : <EmptyState title="Farmer sign-in required" text="Sign in to a farmer workspace to view open customer requests." />}</section></div>;
}

function PortalView(props) {
  const { role, user, workspace, products, onLogin, onRegister, onBack, onAddProduct, onDelivery, onRequestAction, onFpoAction, checkout, setCheckout, onOrder, trackedOrder, trackForm, setTrackForm, onTrack, onCancelOrder, onReportIssue, issueReason, setIssueReason, issueNote, setIssueNote } = props;
  if (role === "customer") return <CustomerPortal products={products} checkout={checkout} setCheckout={setCheckout} onOrder={onOrder} trackedOrder={trackedOrder} trackForm={trackForm} setTrackForm={setTrackForm} onTrack={onTrack} onCancelOrder={onCancelOrder} onReportIssue={onReportIssue} issueReason={issueReason} setIssueReason={setIssueReason} issueNote={issueNote} setIssueNote={setIssueNote} onBack={onBack} />;
  if (!user || user.role !== role) return <><button className="back-link" onClick={onBack}>← Back to FreshFarm</button><AuthPanel role={role} onLogin={onLogin} onRegister={onRegister} /></>;
  if (role === "farmer") return <FarmerPortal user={user} workspace={workspace} onAddProduct={onAddProduct} onDelivery={onDelivery} onRequestAction={onRequestAction} />;
  return <FpoPortal workspace={workspace} onFpoAction={onFpoAction} />;
}

function CustomerPortal({ products, checkout, setCheckout, onOrder, trackedOrder, trackForm, setTrackForm, onTrack, onCancelOrder, onReportIssue, issueReason, setIssueReason, issueNote, setIssueNote, onBack }) {
  const [quantities, setQuantities] = useState({});
  const updateCheckout = (key) => (event) => setCheckout((current) => ({ ...current, [key]: event.target.value }));
  return <><button className="back-link" onClick={onBack}>← Back to FreshFarm</button><section className="content-panel"><div className="section-heading"><div><span className="eyebrow">THE FARMERS' MARKET</span><h1>Fresh from nearby farms</h1></div><span className="count-badge">{products.length} listings</span></div><div className="checkout-grid"><Field label="Your name" value={checkout.customerName} onChange={updateCheckout("customerName")} /><Field label="Phone" type="tel" value={checkout.customerPhone} onChange={updateCheckout("customerPhone")} /><Field label="Delivery address" value={checkout.address} onChange={updateCheckout("address")} /><Field label="Landmark (optional)" value={checkout.landmark} onChange={updateCheckout("landmark")} /></div>
    {products.length ? <div className="product-grid">{products.map((product) => <article className="product-card" key={product._id}>
      <div className="product-photo"><img src={product.photoUrl || sampleProductPhoto(product.name)} alt={`${product.name}${product.photoUrl ? "" : " sample photo"}`} />{!product.photoUrl && <span className="sample-photo">Sample photo</span>}{product.discount > 0 && <b>{Math.round(product.discount * 100)}% off</b>}</div>
      <div className="product-info"><span className="eyebrow">{product.farmer?.village || "LOCAL GROWER"}</span><h2>{product.name}</h2><p>{product.farmer?.name || "Verified farmer"} · {product.qty} {product.unit} available</p>
        <div className="product-bottom"><strong>{money(product.salePrice)}<small>/{product.unit}</small></strong>{product.discount > 0 && <del>{money(product.price)}</del>}
          <label className="quantity-field"><span>Qty</span><input type="number" min="1" max={product.qty} value={quantities[product._id] || 1} onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))} /></label>
          <button className="button primary" onClick={() => onOrder(product, Number(quantities[product._id] || 1))}>Order</button>
        </div>
      </div>
    </article>)}</div> : <EmptyState title="No produce available" text="Approved farmers' current listings will appear here." />}
  </section>
  <section className="content-panel track-panel"><div><span className="eyebrow">ORDER STATUS</span><h2>Track an order</h2><p>Use your order number and phone number.</p></div><form className="track-form" onSubmit={onTrack}><Field label="Order number" value={trackForm.id} onChange={(event) => setTrackForm((current) => ({ ...current, id: event.target.value }))} required /><Field label="Phone" type="tel" value={trackForm.phone} onChange={(event) => setTrackForm((current) => ({ ...current, phone: event.target.value }))} required /><button className="button primary" type="submit">Find order</button></form>
    {trackedOrder && <div className="order-summary"><strong>{trackedOrder.itemName} × {trackedOrder.qty}</strong><span>{trackedOrder.status} · {money(trackedOrder.total)}</span><small>{trackedOrder._id}</small>
      {trackedOrder.status === "New" && <button className="button danger" onClick={onCancelOrder}>Cancel order</button>}
      {trackedOrder.status === "Delivered" && <div className="issue-form"><select value={issueReason} onChange={(event) => setIssueReason(event.target.value)}><option value="">Report a problem</option><option>Poor quality or damaged</option><option>Wrong quantity received</option><option>Order not received</option></select><input value={issueNote} onChange={(event) => setIssueNote(event.target.value)} placeholder="Optional details" /><button className="button quiet" onClick={onReportIssue}>Send to FPO</button></div>}
    </div>}
  </section></>;
}

function FarmerPortal({ user, workspace, onAddProduct, onDelivery, onRequestAction }) {
  const requests = workspace?.requests || [];
  const [etaByOrder, setEtaByOrder] = useState({});
  const [failureByOrder, setFailureByOrder] = useState({});
  const failureReasons = ["Customer not reachable", "Customer refused the order", "Address not found", "Road or vehicle problem", "Produce got damaged"];
  return <><section className="portal-heading"><div><span className="eyebrow">FARMER WORKSPACE</span><h1>Welcome, {user.name}</h1><p>{user.village} · {user.fpoName}</p></div><span className="status-chip approved">Approved farmer</span></section>
    <section className="content-panel"><h2>List new produce</h2><form className="form-grid" onSubmit={onAddProduct}><Field label="Crop" name="name" required /><Field label="Price per unit (₹)" name="price" type="number" min="0.01" step="0.01" required /><Field label="Quantity" name="qty" type="number" min="0.1" step="0.1" required /><label className="field"><span>Unit</span><select name="unit"><option>kg</option><option>bunch</option><option>piece</option><option>bag</option></select></label><Field label="Harvest date" name="harvestDate" type="date" /><Field label="Sell-by date" name="sellBy" type="date" required /><label className="field"><span>Product photo (optional, max 5 MB)</span><input type="file" name="photo" accept="image/*" /></label><button className="button primary full-width" type="submit">Add listing</button></form></section>
    <div className="workspace-grid"><section className="content-panel"><div className="section-heading"><h2>Your listings</h2><span className="count-badge">{workspace?.products?.length || 0}</span></div>{workspace?.products?.length ? workspace.products.map((item) => <div className="data-row" key={item._id}><img className="listing-thumb" src={item.photoUrl || sampleProductPhoto(item.name)} alt={`${item.name}${item.photoUrl ? "" : " sample photo"}`} /><strong>{item.name}</strong><span>{item.qty} {item.unit}</span><span>{money(item.salePrice)}/{item.unit}</span><small>Sell by {dateText(item.sellBy)}{!item.photoUrl && " · sample image"}</small></div>) : <EmptyState title="No listings yet" text="Add a crop above to start selling." />}</section>
      <section className="content-panel"><div className="section-heading"><h2>Customer requests</h2><span className="count-badge">{requests.length}</span></div>{requests.length ? requests.map((request) => <div className="request-row" key={request._id}><div><strong>{request.item}</strong><p>{request.customerName} · {request.phone}</p><small>{request.qty} {request.unit} {request.note && `· ${request.note}`}</small></div><button className="button quiet" onClick={() => onRequestAction(request)}>Mark fulfilled</button></div>) : <EmptyState title="No open requests" text="Customer needs will appear here." />}</section></div>
    <section className="content-panel"><h2>Orders to deliver</h2>{workspace?.orders?.length ? workspace.orders.map((order) => <div className="order-row" key={order._id}><div><strong>{order.itemName} × {order.qty}</strong><p>{order.customerName} · {order.customerPhone}</p><small>{order.address} · {order.status}{order.etaAt ? ` · ETA ${dateText(order.etaAt)}` : ""}</small></div><div className="button-row">{order.status === "New" && <><select aria-label="Expected delivery time" value={etaByOrder[order._id] || 60} onChange={(event) => setEtaByOrder((current) => ({ ...current, [order._id]: event.target.value }))}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="1440">Tomorrow</option></select><button className="button primary" onClick={() => onDelivery(order, "start", { etaMinutes: Number(etaByOrder[order._id] || 60) })}>Start delivery</button></>}{order.status === "Out for delivery" && <button className="button primary" onClick={() => onDelivery(order, "delivered")}>Mark delivered</button>}{["New", "Out for delivery"].includes(order.status) && <><select aria-label="Delivery failure reason" value={failureByOrder[order._id] || ""} onChange={(event) => setFailureByOrder((current) => ({ ...current, [order._id]: event.target.value }))}><option value="">Can’t deliver</option>{failureReasons.map((reason) => <option key={reason}>{reason}</option>)}</select><button className="button danger" disabled={!failureByOrder[order._id]} onClick={() => onDelivery(order, "failed", { reason: failureByOrder[order._id] })}>Report failure</button></>}</div></div>) : <EmptyState title="No orders yet" text="Customer orders will appear here." />}</section>
  </>;
}

function FpoPortal({ workspace, onFpoAction }) {
  return <><section className="portal-heading"><div><span className="eyebrow">FPO WORKSPACE</span><h1>Review and support</h1><p>Farmer approvals, order problems, and near-expiry stock.</p></div><span className="status-chip approved">Officer</span></section>
    <section className="content-panel"><div className="section-heading"><h2>Farmers waiting for approval</h2><span className="count-badge">{workspace?.pendingFarmers?.length || 0}</span></div>{workspace?.pendingFarmers?.length ? workspace.pendingFarmers.map((farmer) => <div className="order-row" key={farmer._id}><div><strong>{farmer.name}</strong><p>{farmer.village} · {farmer.phone}</p><small>{farmer.crops || "Crops not specified"} · {farmer.acres || 0} acres</small></div><div className="button-row"><button className="button primary" onClick={() => onFpoAction(`/fpo/farmers/${farmer._id}`, { status: "approved" })}>Approve</button><button className="button danger" onClick={() => onFpoAction(`/fpo/farmers/${farmer._id}`, { status: "rejected", reason: "Please contact your FPO office." })}>Reject</button></div></div>) : <EmptyState title="No pending farmers" text="New farmer registrations will appear here." />}</section>
    <div className="workspace-grid"><section className="content-panel"><div className="section-heading"><h2>Order problems</h2><span className="count-badge">{workspace?.issues?.length || 0}</span></div>{workspace?.issues?.length ? workspace.issues.map((order) => <div className="order-row" key={order._id}><div><strong>{order.itemName} × {order.qty}</strong><p>{order.customerName} · {order.farmer?.name}</p><small>{order.reason}</small></div><button className="button primary" onClick={() => onFpoAction(`/fpo/orders/${order._id}/resolve`, { resolution: "FPO reviewed and resolved" })}>Resolve</button></div>) : <EmptyState title="No reported issues" text="Customer order problems will appear here." />}</section>
      <section className="content-panel"><h2>Stock nearing sell-by date</h2>{workspace?.expiringProducts?.length ? workspace.expiringProducts.map((item) => <div className="order-row" key={item._id}><div><strong>{item.name} · {item.farmer?.name}</strong><p>{item.qty} {item.unit} · sell by {dateText(item.sellBy)}</p></div><div className="button-row"><button className="button quiet" onClick={() => onFpoAction(`/fpo/products/${item._id}/action`, { action: "surplus" })}>−25% deal</button><button className="button quiet" onClick={() => onFpoAction(`/fpo/products/${item._id}/action`, { action: "donate" })}>Donate</button></div></div>) : <EmptyState title="No urgent stock" text="Products near their sell-by date appear here." />}</section></div>
  </>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span>—</span><strong>{title}</strong><p>{text}</p></div>;
}

export default App;
