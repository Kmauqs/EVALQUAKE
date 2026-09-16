import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, role, jurisdictions = "Nacional"] = process.argv.slice(2);

const validRoles = ["evaluator", "coordinator", "admin"];

if (!email || !validRoles.includes(role)) {
  console.error(
    "Uso: node scripts/set-user-role.mjs email role jurisdiction1,jurisdiction2"
  );
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: "evalquake",
});

const auth = getAuth();
const db = getFirestore();
const user = await auth.getUserByEmail(email);
const jurisdictionIds = jurisdictions.split(",").map((value) => value.trim()).filter(Boolean);

await auth.setCustomUserClaims(user.uid, {
  ...user.customClaims,
  role,
  jurisdictionIds,
});
await auth.revokeRefreshTokens(user.uid);
await db.doc(`users/${user.uid}`).set(
  {
    id: user.uid,
    email: user.email ?? email,
    role,
    jurisdictionIds,
    status: user.disabled ? "disabled" : "active",
    disabled: user.disabled === true,
    updatedAt: new Date().toISOString(),
  },
  { merge: true },
);

console.log(`Rol ${role} asignado a ${email}`);
console.log(`Jurisdicciones: ${jurisdictions}`);
