import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Caso, Suspeito, Evento, Sessao } from '../../investigation/types';

// Credenciais via variáveis de ambiente (configurar no painel do Netlify):
// - FIREBASE_SERVICE_ACCOUNT_JSON: conteúdo JSON completo da service account
// - FIREBASE_PROJECT_ID: opcional, cai no project_id da própria service account
//
// Modo emulador/teste: se FIRESTORE_EMULATOR_HOST estiver definido (ex: ao
// rodar `firebase emulators:start` localmente), nenhuma credencial real é
// necessária - o Admin SDK conversa direto com o emulador. Basta um
// projectId (qualquer string, convencionalmente prefixada com "demo-").
function getFirebaseApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-aethelgard',
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON não configurada. Defina essa variável de ambiente ' +
      'no Netlify com o JSON da service account do projeto Firebase/Firestore (ou defina ' +
      'FIRESTORE_EMULATOR_HOST para rodar contra o emulador local).'
    );
  }

  const serviceAccount = JSON.parse(raw);
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });
}

export function db(): Firestore {
  return getFirestore(getFirebaseApp());
}

export const COLECOES = {
  casos: 'casos',
  suspeitos: 'suspeitos',
  eventos: 'eventos',
  sessoes: 'sessoes',
} as const;

export function casosRef() {
  return db().collection(COLECOES.casos);
}
export function suspeitosRef() {
  return db().collection(COLECOES.suspeitos);
}
export function eventosRef() {
  return db().collection(COLECOES.eventos);
}
export function sessoesRef() {
  return db().collection(COLECOES.sessoes);
}

export async function obterCaso(casoId: string): Promise<Caso | null> {
  const doc = await casosRef().doc(casoId).get();
  return doc.exists ? (doc.data() as Caso) : null;
}

export async function listarSuspeitosPorCaso(casoId: string): Promise<Suspeito[]> {
  const snap = await suspeitosRef().where('casoId', '==', casoId).get();
  return snap.docs.map((d) => d.data() as Suspeito);
}

export async function listarEventosPorCaso(casoId: string): Promise<Evento[]> {
  const snap = await eventosRef().where('casoId', '==', casoId).get();
  return snap.docs.map((d) => d.data() as Evento);
}

export async function obterSessao(sessaoId: string): Promise<Sessao | null> {
  const doc = await sessoesRef().doc(sessaoId).get();
  return doc.exists ? (doc.data() as Sessao) : null;
}
