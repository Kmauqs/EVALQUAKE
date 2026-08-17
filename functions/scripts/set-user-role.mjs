import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, role, jurisdictions = "jurisdiction-demo"] = process.argv.slice(2);

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
const user = await auth.getUserByEmail(email);

await auth.setCustomUserClaims(user.uid, {
  ...user.customClaims,
  role,
  jurisdictionIds: jurisdictions.split(","),
});

await auth.revokeRefreshTokens(user.uid);

console.log(`Rol ${role} asignado a ${email}`);
console.log(`Jurisdicciones: ${jurisdictions}`);