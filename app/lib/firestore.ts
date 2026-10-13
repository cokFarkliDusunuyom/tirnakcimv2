import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type FirestoreRecord = DocumentData & { id: string };

export function watchActiveCollection(
  collectionName: string,
  onData: (records: FirestoreRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  if (!db) return null;
  return onSnapshot(
    query(collection(db, collectionName), where("isActive", "==", true)),
    (snapshot) => onData(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))),
    onError,
  );
}

export function watchAvailableSlots(
  onData: (records: FirestoreRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  if (!db) return null;
  return onSnapshot(
    query(collection(db, "availability"), where("status", "==", "available")),
    (snapshot) => onData(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))),
    onError,
  );
}

export async function submitSalonApplication(input: {
  salonName: string;
  contactName: string;
  phone: string;
  district: string;
}) {
  if (!db) throw new Error("Firebase yapılandırması eksik.");
  return addDoc(collection(db, "salonApplications"), {
    ...input,
    city: "Ankara",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function submitAppointment(input: {
  salonId: string;
  stylistId: string;
  serviceId: string;
  availabilityId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  endsAt: Date;
}) {
  if (!db) throw new Error("Firebase yapılandırması eksik.");
  return addDoc(collection(db, "appointments"), {
    ...input,
    startsAt: Timestamp.fromDate(input.startsAt),
    endsAt: Timestamp.fromDate(input.endsAt),
    status: "pending",
    createdAt: serverTimestamp(),
  });
}
