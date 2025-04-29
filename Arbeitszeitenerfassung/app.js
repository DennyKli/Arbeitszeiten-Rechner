// Importiere die benötigten Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Deine Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBSE2xG0l4WgFTz3X9R5Mwbnti-3WPR7lU",
  authDomain: "arbeitszeiten-programm.firebaseapp.com",
  projectId: "arbeitszeiten-programm",
  storageBucket: "arbeitszeiten-programm.appspot.com",
  messagingSenderId: "434876138912",
  appId: "1:434876138912:web:d7b556b3044f181b4710c5",
  measurementId: "G-T6C1MNX7T1"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hilfsfunktion: Arbeitszeit berechnen
function berechneArbeitszeit(ankunft, gehzeit, pauseMinuten) {
  const [aH, aM] = ankunft.split(":").map(Number);
  const [gH, gM] = gehzeit.split(":").map(Number);
  let start = aH * 60 + aM;
  let end = gH * 60 + gM;
  if (end < start) end += 24 * 60; // Über Mitternacht
  let dauer = end - start - pauseMinuten;
  return (dauer / 60).toFixed(2);
}

// Eintrag speichern
export async function speichereEintrag(name, datum, ankunft, pause, gehzeit) {
  const arbeitszeit = berechneArbeitszeit(ankunft, gehzeit, parseInt(pause));
  await addDoc(collection(db, "arbeitszeiten"), {
    name,
    datum,
    ankunft,
    pause: parseInt(pause),
    gehzeit,
    arbeitszeit: parseFloat(arbeitszeit)
  });
}

// Alle Einträge laden (sortiert nach Datum absteigend)
export async function ladeEintraege() {
  const q = query(collection(db, "arbeitszeiten"), orderBy("datum", "desc"));
  const querySnapshot = await getDocs(q);
  let daten = [];
  querySnapshot.forEach((doc) => {
    daten.push({ id: doc.id, ...doc.data() });
  });
  return daten;
}

// Eintrag löschen
export async function loescheEintrag(id) {
  await deleteDoc(doc(db, "arbeitszeiten", id));
}

// Wochenarbeitszeit & Überstunden pro Person berechnen
export async function wochenUebersicht() {
  const daten = await ladeEintraege();
  const result = {};
  daten.forEach(e => {
    const woche = getWeek(e.datum);
    if (!result[e.name]) result[e.name] = {};
    if (!result[e.name][woche]) result[e.name][woche] = 0;
    result[e.name][woche] += e.arbeitszeit;
  });
  // Überstunden berechnen (Basis: 40h/Woche)
  const ueberstunden = {};
  for (const name in result) {
    ueberstunden[name] = {};
    for (const woche in result[name]) {
      ueberstunden[name][woche] = (result[name][woche] - 40).toFixed(2);
    }
  }
  return { result, ueberstunden };
}

// Hilfsfunktion: Wochennummer aus Datum (YYYY-MM-DD)
function getWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const yearStart = new Date(d.getFullYear(),0,1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getFullYear()}-KW${weekNo}`;
}
