// Renders the REAL vs360-webapp layout and dashboard (src/layouts/PrivateLayout
// + src/pages/Dashboard/NewDashboard) with its real theme, store and routing.
// capture.mjs serves this through Vite rooted at ../vs360-webapp and swaps every
// src/services/* module for fixtures (./fixtures.js). vs360-webapp is not modified.
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "/src/index.css";
import { Suspense, lazy, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import reducers from "/src/store/reducers/index.js";
import { authActions } from "/src/store/reducers/authReducer.js";
import ThemeWrapper from "/src/apps/ThemeWrapper.jsx";
import PrivateLayout from "/src/layouts/PrivateLayout.jsx";
import NewDashboard from "/src/pages/Dashboard/NewDashboard/NewDashboard.jsx";
import CasesManagement from "/src/pages/Cases/CasesManagement.jsx";
import AgencyProfile from "/src/pages/AgencyProfile/AgencyProfile.jsx";
import HotlineManagement from "/src/pages/HotlineManagement/HotlineManagement.jsx";
import AuditLog from "/src/pages/AuditLog/AuditLog.jsx";
import UserManagement from "/src/pages/UserManagement/UserManagement.jsx";
import ShelterLocations from "/src/pages/ShelterManagement/ShelterLocations.jsx";
import BedManagement from "/src/pages/ShelterManagement/BedManagement.jsx";
import SageValidator from "/src/pages/Reports/SageValidator/SageValidator.jsx";
import NotesCenter from "/src/pages/NotesCenter/NotesCenter.jsx";
import Drive from "/src/pages/Drive/Drive.jsx";
import InternalChat from "/src/pages/InternalChat/InternalChat.jsx";
import MyNetwork from "/src/pages/MyNetwork/MyNetwork.jsx";
import StaffTimeManagement from "/src/pages/StaffTime/StaffTimeManagement.jsx";
import ServiceManagement from "/src/pages/ServiceManagement/ServiceManagement.jsx";
import CreateService from "/src/pages/ServiceManagement/CreateService.jsx";
import UpdateService from "/src/pages/ServiceManagement/UpdateService.jsx";
import ServiceDetails from "/src/pages/ServiceManagement/ServiceDetails.jsx";
import VerifyUser from "/src/components/pages/Auth/VerifyUser.jsx";
import Tools from "/src/pages/Tools/Tools.jsx";
import { MODULES, USERS, VICTIM_SERVICES } from "./fixtures.js";

// Reports pages, loaded by glob so a page that only exists on a feature branch
// (FVPSA / VAWA reports) doesn't break captures against develop.
const REPORT_PAGES = import.meta.glob("/src/pages/Reports/*/*.jsx");
const page = (dir) => {
  const load = REPORT_PAGES[`/src/pages/Reports/${dir}/${dir}.jsx`];
  return load ? lazy(load) : () => null;
};
const REPORT_ROUTES = [
  ["/reports", "../Reports"], ["/reports/pmt-grants", "PmtGrants"], ["/reports/pmt-reports", "PmtReport"],
  ["/reports/pmt-questionnaires", "PmtQuestionnaires"], ["/reports/custom-report-builder", "CustomReportBuilder"],
  ["/reports/voca-validator", "VocaValidator"], ["/reports/hscc-validator", "HsccValidator"],
  ["/reports/tmwf-compliance-report", "TmwfComplianceReport"], ["/reports/staff-time-report", "StaffTimeReport"], ["/reports/missing-hud-data", "HmisDataCompleteness"],
  ["/reports/fvpsa-report", "FvpsaReport"], ["/reports/fvpsa-report/:uid", "FvpsaReport"],
  ["/reports/vclg-report", "VclgReport"], ["/reports/vclg-report/:uid", "VclgReport"],
  ["/reports/vawa-reports", "VawaReports"], ["/reports/vawa-reports/:uid", "VawaReports"],
].map(([path, dir]) => [path, dir === "../Reports" ? lazy(() => import("/src/pages/Reports/Reports.jsx")) : page(dir)]);

function makeStore(kind) {
  const store = configureStore({ reducer: reducers, middleware: (m) => m({ serializableCheck: false }) });
  store.dispatch(authActions.signin({ user: USERS[kind], accessToken: "demo", refreshToken: "demo", modules: MODULES }));
  return store;
}

function App({ kind, path }) {
  const [store] = useState(() => makeStore(kind));
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));
  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <ThemeWrapper>
          <MemoryRouter initialEntries={[window.__routeState ? { pathname: path, state: window.__routeState } : path]}>
            <Routes>
              <Route path="/verify-user" element={<VerifyUser />} />
              <Route element={<PrivateLayout />}>
                <Route path="/dashboard" element={<div id="cap-content"><NewDashboard /></div>} />
                <Route path="/case-view-2" element={<CasesManagement />} />
                <Route path="/profile/agency" element={<AgencyProfile />} />
                <Route path="/hotline" element={<HotlineManagement />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/shelter" element={<ShelterLocations />} />
                <Route path="/shelter/:locationId" element={<BedManagement />} />
                <Route path="/reports/sage-validator" element={<SageValidator />} />
                <Route path="/notes-center" element={<NotesCenter />} />
                <Route path="/drive" element={<Drive />} />
                <Route path="/internal-chat" element={<InternalChat />} />
                <Route path="/my-network" element={<MyNetwork />} />
                <Route path="/staff-time" element={<StaffTimeManagement />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/services" element={<ServiceManagement />} />
                <Route path="/services/create" element={<CreateService />} />
                <Route path="/services/update/:uid" element={<UpdateService />} />
                <Route path="/services/:uid" element={<ServiceDetails />} />
                {REPORT_ROUTES.map(([path, Page]) => (
                  <Route key={path} path={path} element={<Suspense fallback={null}><Page /></Suspense>} />
                ))}
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeWrapper>
      </QueryClientProvider>
    </Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
// a fixture service, for pages that read it from router state
window.__fixtureService = (uid) => VICTIM_SERVICES.find((v) => v.uid === uid);

window.__render = (kind, path = "/dashboard") =>
  new Promise((resolve) => {
    window.__calls = [];
    root.render(<App key={`${kind}-${Date.now()}`} kind={kind} path={path} />);
    setTimeout(resolve, 2500); // let queries resolve and widgets animate in
  });

// Bounding boxes (page coordinates) of dashboard widgets, found by their titles.
window.__rects = (titles) => {
  const out = {};
  for (const t of titles) {
    const match = t.startsWith("^") ? (s) => s.startsWith(t.slice(1)) : (s) => s.toLowerCase() === t.toLowerCase();
    const el = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div")].find((n) => n.children.length === 0 && match(n.textContent.trim()));
    // the widget card around the text (Quick Note → the whole quick-actions card)
    let box = el?.closest(".mantine-Paper-root") ?? el;
    if (t === "Quick Note") box = box?.parentElement?.closest(".mantine-Paper-root") ?? box;
    if (!box) continue;
    const r = box.getBoundingClientRect();
    out[t] = { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  }
  return out;
};
// ---- interaction helpers for capture plans (text-addressed, like a user) ----
const visible = (n) => {
  const r = n.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
};
// smallest visible element whose own text matches; "^x" = startsWith, "~x" = includes
window.__find = (text, nth = 0) => {
  const m = text.startsWith("^") ? (s) => s.startsWith(text.slice(1)) : text.startsWith("~") ? (s) => s.includes(text.slice(1)) : (s) => s === text;
  const hits = [...document.querySelectorAll("body *")].filter((n) => visible(n) && m((n.textContent || "").trim()) && ![...n.children].some((c) => m((c.textContent || "").trim())));
  hits.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  return hits[nth] ?? null;
};
const clickable = (el) => el?.closest("button, a, [role=tab], [role=option], [role=menuitem], [role=checkbox], [role=radio], label, input, [data-clickable]") ?? el;
window.__click = (text, nth = 0) => {
  const el = window.__find(text, nth);
  if (!el) throw new Error(`no element "${text}"`);
  const target = clickable(el);
  target.scrollIntoView({ block: "center" });
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) target.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  target.click();
  return true;
};
// click an element found by CSS selector (icons without text), optionally the nth match
window.__clickSel = (sel, nth = 0) => {
  const el = [...document.querySelectorAll(sel)].filter(visible)[nth];
  if (!el) throw new Error(`no element ${sel}`);
  el.click();
  return true;
};
// type into an input/textarea (found by CSS selector) the way React expects
window.__type = (sel, text) => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`no input ${sel}`);
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
};
window.__scrollTo = (text, block = "start") => {
  const el = window.__find(text);
  if (!el) throw new Error(`no element "${text}"`);
  el.scrollIntoView({ block });
  return true;
};
window.__box = (texts) => {
  const out = {};
  for (const t of texts) {
    const [label, how] = Array.isArray(t) ? t : [t, null];
    let el = window.__find(label);
    if (!el) continue;
    if (how === "card") el = el.closest(".mantine-Paper-root, .mantine-Card-root") ?? el;
    if (how === "button") el = clickable(el);
    if (how === "input") el = el.closest(".mantine-InputWrapper-root") ?? el;
    if (how === "modal") el = el.closest(".mantine-Modal-content") ?? el;
    if (how === "tabs") el = el.closest(".mantine-Tabs-list") ?? el;
    const r = el.getBoundingClientRect();
    out[label] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }
  return out;
};
window.__ready = true;
