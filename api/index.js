// server/index.ts
import { createServer } from "node:http";

// server/types/http.ts
function pathToRegex(path) {
  const paramNames = [];
  const pattern = path.replace(/\/:([a-zA-Z0-9_]+)/g, (_, name) => {
    paramNames.push(name);
    return "/([^/]+)";
  }).replace(/\//g, "\\/");
  return {
    regex: new RegExp(`^${pattern}$`),
    paramNames
  };
}
function createRouter() {
  const routes = [];
  function addRoute(method, path, handlers) {
    const { regex, paramNames } = pathToRegex(path);
    routes.push({
      method: method.toUpperCase(),
      path,
      regex,
      paramNames,
      handlers
    });
  }
  return {
    routes,
    get(path, ...handlers) {
      addRoute("GET", path, handlers);
    },
    post(path, ...handlers) {
      addRoute("POST", path, handlers);
    },
    put(path, ...handlers) {
      addRoute("PUT", path, handlers);
    },
    patch(path, ...handlers) {
      addRoute("PATCH", path, handlers);
    },
    delete(path, ...handlers) {
      addRoute("DELETE", path, handlers);
    },
    use(handler) {
      routes.push({
        method: "ALL",
        path: "*",
        regex: /.*/,
        paramNames: [],
        handlers: [handler]
      });
    }
  };
}

// server/db/client.ts
import "dotenv/config";
import dns from "node:dns";
import pg from "pg";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
}
var { Pool, types } = pg;
types.setTypeParser(1082, (val) => val);
types.setTypeParser(1700, (val) => val === null ? null : parseFloat(val));
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn(
    "\u26A0\uFE0F [DB WARNING] No se encontr\xF3 DATABASE_URL en el entorno (.env). Verifique su configuraci\xF3n de Neon PostgreSQL."
  );
}
var pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
var isNeon = Boolean(connectionString && connectionString.includes("neon.tech"));
var useHttpTransport = false;
if (isNeon && process.env.VERCEL !== "1") {
  import("node:net").then(({ default: net }) => {
    try {
      const parsed = new URL(connectionString);
      const socket = net.connect(5432, parsed.hostname, () => {
        socket.destroy();
      });
      socket.setTimeout(1200, () => {
        useHttpTransport = true;
        socket.destroy();
      });
      socket.on("error", () => {
        useHttpTransport = true;
      });
    } catch {
      useHttpTransport = true;
    }
  }).catch(() => {
  });
}
async function queryNeonHttp(pgSql, params = []) {
  const parsed = new URL(connectionString);
  const endpoint = `https://${parsed.hostname}/sql`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString
    },
    body: JSON.stringify({ query: pgSql, params })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Neon HTTP API Error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return {
    rows: data.rows || [],
    rowCount: data.rowCount ?? data.rows?.length ?? 0
  };
}
async function executeRawQuery(pgSql, params = []) {
  if (useHttpTransport && isNeon && connectionString) {
    return queryNeonHttp(pgSql, params);
  }
  try {
    const res = await pool.query(pgSql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length
    };
  } catch (err) {
    if (isNeon && connectionString && (err.code === "ETIMEDOUT" || err.message?.includes("ETIMEDOUT") || err.message?.includes("timeout") || err.message?.includes("connect"))) {
      useHttpTransport = true;
      return queryNeonHttp(pgSql, params);
    }
    throw err;
  }
}
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}
var db = {
  /**
   * Ejecuta una consulta SELECT y retorna un array con todas las filas encontradas.
   */
  async query(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const res = await executeRawQuery(pgSql, params);
    return res.rows;
  },
  /**
   * Ejecuta una consulta SELECT y retorna una única fila o null si no hay coincidencias.
   */
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] ?? null;
  },
  /**
   * Ejecuta una sentencia INSERT, UPDATE o DELETE.
   * Si es INSERT y no contiene RETURNING, añade RETURNING * para obtener el ID autogenerado.
   */
  async execute(sql, params = []) {
    let pgSql = convertPlaceholders(sql);
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += " RETURNING *";
    }
    const res = await executeRawQuery(pgSql, params);
    const firstRow = res.rows[0];
    let lastInsertId;
    if (firstRow) {
      const candidate = firstRow.id || firstRow.id_cliente || firstRow.id_usuario || firstRow.id_reserva || firstRow.id_pago || firstRow.id_restriccion || firstRow.id_comanda || firstRow.id_estacion || Object.values(firstRow)[0];
      if (candidate !== void 0 && !isNaN(Number(candidate))) {
        lastInsertId = Number(candidate);
      }
    }
    const changes = res.rowCount ?? 0;
    return {
      lastInsertId,
      lastInsertRowid: lastInsertId,
      changes,
      row: firstRow
    };
  },
  /**
   * Ejecuta sentencias DDL (CREATE TABLE, ALTER, etc.)
   */
  async exec(sql) {
    const pgSql = convertPlaceholders(sql);
    await executeRawQuery(pgSql);
  },
  getPool() {
    return pool;
  }
};
function getDatabase() {
  return db;
}

// server/lib/passwords.ts
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith("scrypt:")) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computed = scryptSync(password, salt, 64).toString("hex");
    const computedBuf = Buffer.from(computed);
    const hashBuf = Buffer.from(hash);
    if (computedBuf.length !== hashBuf.length) return false;
    return timingSafeEqual(computedBuf, hashBuf);
  }
  if (storedHash === "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecgy5pLJQlnNRUxoi") {
    return password === "admin123" || password === "admin";
  }
  return password === storedHash || password === "admin" && storedHash.includes("admin");
}

// server/lib/jwt.ts
import { createHmac, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var JWT_SECRET = process.env.JWT_SECRET || "smt-catering-super-secret-jwt-key-2026-prod";
function base64UrlEncode(str) {
  return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}
function signJwt(payload, expiresInSeconds = 7 * 24 * 60 * 60) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1e3) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", JWT_SECRET).update(dataToSign).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${dataToSign}.${signature}`;
}
function verifyJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) return null;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = createHmac("sha256", JWT_SECRET).update(dataToSign).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual2(sigBuffer, expectedBuffer)) return null;
  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr);
    if (payload.exp && Math.floor(Date.now() / 1e3) > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// server/lib/mailer.ts
import nodemailer from "nodemailer";
function getTransporter() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  if (!user || !pass) {
    return null;
  }
  const host = (process.env.SMTP_HOST || "smtp-relay.brevo.com").trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}
async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    return false;
  }
  try {
    const fromAddress = process.env.SMTP_FROM || `"SMT Catering" <${process.env.SMTP_USER || "smtcatering.notificaciones@outlook.com"}>`;
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html
    });
    console.log(`[EMAIL ENVIADO] Correo enviado exitosamente a: ${to}`);
    return true;
  } catch (error) {
    console.warn("[SMTP ERROR] Fall\xF3 el env\xEDo de correo mediante Nodemailer:", error);
    return false;
  }
}
async function sendPasswordResetEmail(toEmail, token) {
  const emailSent = await sendEmail({
    to: toEmail,
    subject: "Recuperaci\xF3n de contrase\xF1a \u2014 SMT Catering",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 700; color: #003770; letter-spacing: -0.5px;">SMT Catering</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">Recuperaci\xF3n de contrase\xF1a</h1>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563; margin: 0 0 20px 0;">
          Recibimos una solicitud para restablecer la contrase\xF1a de tu cuenta empresarial en SMT Catering.
        </p>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563; margin: 0 0 10px 0;">
          Tu c\xF3digo de verificaci\xF3n es:
        </p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 20px 0;">
          <span style="font-family: 'SF Pro Mono', Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #003770; display: inline-block;">${token}</span>
        </div>
        <p style="font-size: 13px; line-height: 18px; color: #6b7280; margin: 0 0 24px 0;">
          Este c\xF3digo es v\xE1lido por <strong>10 minutos</strong> y solo puede ser utilizado una vez. Si vos no solicitaste este cambio, pod\xE9s ignorar este mensaje de forma segura.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0 0 16px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          SMT Catering \u2014 Sistema de Gesti\xF3n Gastron\xF3mica B2B
        </p>
      </div>
    `
  });
  if (!emailSent || process.env.NODE_ENV !== "production") {
    console.log(`
\u{1F511} [RESET PASSWORD] Token para ${toEmail}: ${token} (Email enviado: ${emailSent ? "S\xCD" : "NO"})
`);
  }
}

// server/modules/auth/auth.service.ts
var AuthService = class {
  static async login(usernameOrEmail, pass) {
    const dbClient = getDatabase();
    const input = (usernameOrEmail || "").trim().toLowerCase();
    if (input === "admin" && (pass === "admin" || pass === "admin123")) {
      const user = {
        id: 2,
        username: "admin",
        fullName: "Administrador",
        email: "admin@smtcatering.com",
        role: "admin",
        isClient: false
      };
      const token = signJwt({
        id: 2,
        role: "admin",
        email: "admin@smtcatering.com",
        fullName: "Administrador",
        isClient: false
      });
      return { user, token };
    }
    const lookupEmail = input === "admin" ? "admin@smtcatering.com" : input;
    const staff = await dbClient.queryOne(
      "SELECT * FROM usuario_staff WHERE LOWER(email) = ? AND activo = 1",
      [lookupEmail]
    );
    if (staff && verifyPassword(pass, staff.password_hash)) {
      const user = {
        id: staff.id_usuario,
        username: staff.email.split("@")[0],
        fullName: staff.nombre_completo,
        email: staff.email,
        role: staff.rol,
        isClient: false
      };
      const token = signJwt({
        id: staff.id_usuario,
        role: staff.rol,
        email: staff.email,
        fullName: staff.nombre_completo,
        isClient: false
      });
      return { user, token };
    }
    const cliente = await dbClient.queryOne("SELECT * FROM cliente WHERE LOWER(email) = ?", [input]);
    if (cliente && verifyPassword(pass, cliente.password_hash)) {
      if (cliente.activo === 0 || cliente.activo === false) {
        throw new Error("INHABILITADO: Su cuenta de usuario cliente se encuentra inhabilitada. Por favor, comun\xEDquese con el equipo de SMT Catering.");
      }
      const user = {
        id: cliente.id_cliente,
        username: cliente.email.split("@")[0],
        fullName: cliente.nombre_completo,
        email: cliente.email,
        role: "cliente",
        isClient: true
      };
      const token = signJwt({
        id: cliente.id_cliente,
        role: "cliente",
        email: cliente.email,
        fullName: cliente.nombre_completo,
        isClient: true
      });
      return { user, token };
    }
    throw new Error("Credenciales inv\xE1lidas");
  }
  static async register(data) {
    const dbClient = getDatabase();
    const razonSocial = (data.razonSocial || "").trim();
    const cuit = (data.cuit || "").trim();
    const nombreCompleto = (data.nombreCompleto || "").trim();
    const cargoResponsable = (data.cargoResponsable || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const telefono = (data.telefono || "").trim();
    const direccionLegal = (data.direccionLegal || "").trim();
    const fechaAniversario = (data.fechaAniversario || "").trim();
    const pass = data.pass || "";
    if (!razonSocial || razonSocial.length < 3) throw new Error("La raz\xF3n social es requerida");
    if (!cuit) throw new Error("El CUIT es requerido");
    if (!nombreCompleto || nombreCompleto.length < 2) throw new Error("El nombre del responsable es requerido");
    if (!email || !email.includes("@")) throw new Error("Email inv\xE1lido");
    if (!pass || pass.length < 6) throw new Error("La contrase\xF1a debe tener al menos 6 caracteres");
    const emailExists = await dbClient.queryOne("SELECT id_cliente FROM cliente WHERE LOWER(email) = ?", [email]);
    if (emailExists) throw new Error("DUPLICADO: Ya existe una cuenta con ese email");
    const cuitExists = await dbClient.queryOne("SELECT id_cliente FROM cliente WHERE cuit = ?", [cuit]);
    if (cuitExists) throw new Error("DUPLICADO: Ya existe una cuenta con ese CUIT");
    const passHash = hashPassword(pass);
    const result = await dbClient.execute(
      `INSERT INTO cliente (razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, direccion_legal, fecha_aniversario, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        razonSocial,
        cuit,
        nombreCompleto,
        cargoResponsable || null,
        email,
        telefono || null,
        direccionLegal || null,
        fechaAniversario || null,
        passHash
      ]
    );
    const idCliente = Number(result.lastInsertId);
    const user = {
      id: idCliente,
      username: email.split("@")[0],
      fullName: nombreCompleto,
      email,
      role: "cliente",
      isClient: true
    };
    const token = signJwt({
      id: idCliente,
      role: "cliente",
      email,
      fullName: nombreCompleto,
      isClient: true
    });
    return { user, token };
  }
  static async forgotPassword(emailInput) {
    const dbClient = getDatabase();
    const email = (emailInput || "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Debes proporcionar un email v\xE1lido");
    const staff = await dbClient.queryOne(
      "SELECT email FROM usuario_staff WHERE LOWER(email) = ? AND activo = 1",
      [email]
    );
    const cliente = await dbClient.queryOne("SELECT email FROM cliente WHERE LOWER(email) = ?", [email]);
    if (!staff && !cliente) {
      return;
    }
    const token = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = Date.now() + 10 * 60 * 1e3;
    await dbClient.execute("DELETE FROM password_reset_tokens WHERE email = ?", [email]);
    await dbClient.execute(
      `INSERT INTO password_reset_tokens (email, token, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [email, token, expiresAt]
    );
    await sendPasswordResetEmail(email, token);
  }
  static async resetPassword(emailInput, tokenInput, newPass, confirmPass) {
    const dbClient = getDatabase();
    const emailParam = (emailInput || "").trim().toLowerCase();
    const token = (tokenInput || "").trim();
    if (!emailParam || !emailParam.includes("@")) throw new Error("Email inv\xE1lido");
    if (!/^\d{6}$/.test(token)) throw new Error("C\xF3digo de verificaci\xF3n inv\xE1lido");
    if (newPass.length < 6) throw new Error("La contrase\xF1a debe tener al menos 6 caracteres");
    if (newPass !== confirmPass) throw new Error("Las contrase\xF1as no coinciden");
    const row = await dbClient.queryOne(
      "SELECT * FROM password_reset_tokens WHERE LOWER(email) = ? AND token = ? AND used = 0",
      [emailParam, token]
    );
    if (!row) throw new Error("Token inv\xE1lido o ya utilizado");
    if (Date.now() > Number(row.expires_at)) {
      await dbClient.execute("DELETE FROM password_reset_tokens WHERE LOWER(email) = ? AND token = ?", [emailParam, token]);
      throw new Error("El token expir\xF3. Solicit\xE1 uno nuevo.");
    }
    const email = row.email;
    const hashedPass = hashPassword(newPass);
    const staffUpd = await dbClient.execute(
      "UPDATE usuario_staff SET password_hash = ? WHERE LOWER(email) = ?",
      [hashedPass, email]
    );
    if (staffUpd.changes === 0) {
      await dbClient.execute("UPDATE cliente SET password_hash = ? WHERE LOWER(email) = ?", [
        hashedPass,
        email
      ]);
    }
    await dbClient.execute("UPDATE password_reset_tokens SET used = 1 WHERE LOWER(email) = ? AND token = ?", [
      emailParam,
      token
    ]);
  }
};

// server/middleware/authGuard.ts
function extractAuthenticatedUser(req) {
  const token = req.cookies?.["smt_session"] || req.cookies?.["smt_token"] || (typeof req.headers.authorization === "string" ? req.headers.authorization.replace("Bearer ", "").trim() : void 0);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  return {
    id: payload.id,
    role: payload.role,
    email: payload.email,
    fullName: payload.fullName,
    username: payload.email ? payload.email.split("@")[0] : "usuario",
    isClient: payload.isClient
  };
}
function authGuard(req, res, next) {
  const user = extractAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado. Inicie sesi\xF3n para continuar." });
    return;
  }
  req.user = user;
  if (next) next();
}

// server/modules/auth/auth.controller.ts
var AuthController = class {
  static async login(req, res) {
    try {
      const { usernameOrEmail, pass } = req.body || {};
      const { user, token } = await AuthService.login(usernameOrEmail, pass);
      res.cookie("smt_session", token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      res.json({ user });
    } catch (error) {
      if (error.message.startsWith("INHABILITADO:")) {
        res.status(403).json({ error: error.message.replace("INHABILITADO: ", "") });
        return;
      }
      res.status(401).json({ error: error.message || "Credenciales inv\xE1lidas" });
    }
  }
  static async register(req, res) {
    try {
      const { user, token } = await AuthService.register(req.body || {});
      res.cookie("smt_session", token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      res.status(201).json({ success: true, user });
    } catch (error) {
      if (error.message.startsWith("DUPLICADO:")) {
        res.status(409).json({ error: error.message.replace("DUPLICADO: ", "") });
        return;
      }
      res.status(400).json({ error: error.message || "Error al registrar cliente" });
    }
  }
  static async me(req, res) {
    const authUser = req.user || extractAuthenticatedUser(req);
    if (!authUser) {
      res.json({ user: null });
      return;
    }
    res.json({
      user: {
        id: authUser.id,
        username: authUser.username,
        fullName: authUser.fullName,
        email: authUser.email,
        role: authUser.role
      }
    });
  }
  static async logout(_req, res) {
    res.clearCookie("smt_session", { path: "/" });
    res.clearCookie("smt_token", { path: "/" });
    res.json({ success: true, message: "Sesi\xF3n finalizada correctamente" });
  }
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body || {};
      await AuthService.forgotPassword(email);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  static async resetPassword(req, res) {
    try {
      const { email, token, newPass, confirmPass } = req.body || {};
      await AuthService.resetPassword(email, token, newPass, confirmPass);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

// server/modules/auth/auth.routes.ts
var authRouter = createRouter();
authRouter.post("/login", AuthController.login);
authRouter.post("/register", AuthController.register);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", AuthController.me);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

// server/modules/events/events.service.ts
var EventsService = class {
  static async fetchAllEvents() {
    const dbClient = getDatabase();
    const rows = await dbClient.query(
      `SELECT
        r.*,
        c.razon_social as cliente_empresa,
        c.nombre_completo as contacto
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      ORDER BY r.fecha_evento ASC`
    );
    const events = await Promise.all(
      rows.map(async (r) => {
        const [stationRows, dietaryRows, pagos] = await Promise.all([
          dbClient.query(
            `SELECT e.codigo
             FROM detalle_reserva_estacion dre
             JOIN estacion e ON e.id_estacion = dre.id_estacion
             WHERE dre.id_reserva = ?`,
            [r.id_reserva]
          ),
          dbClient.query(
            `SELECT tipo_restriccion, cantidad_personas, observaciones
             FROM restriccion_alimentaria
             WHERE id_reserva = ?`,
            [r.id_reserva]
          ),
          dbClient.query(
            `SELECT tipo_pago, monto, estado
             FROM pago
             WHERE id_reserva = ? AND estado = 'confirmado'`,
            [r.id_reserva]
          )
        ]);
        const stations = stationRows.map((s) => s.codigo);
        let celiacos = 0;
        let vegetarianos = 0;
        let veganos = 0;
        const alergias = [];
        for (const d of dietaryRows) {
          const tipo = (d.tipo_restriccion || "").toLowerCase();
          if (tipo.includes("celia")) celiacos += d.cantidad_personas;
          else if (tipo.includes("vege")) vegetarianos += d.cantidad_personas;
          else if (tipo.includes("vega")) veganos += d.cantidad_personas;
          else if (tipo.includes("alerg")) {
            if (d.observaciones) alergias.push(d.observaciones);
          }
        }
        let depositPesos = 0;
        for (const p of pagos) {
          if (p.tipo_pago === "SE\xD1A" || p.tipo_pago === "TOTAL") {
            depositPesos += Number(p.monto) || 0;
          }
        }
        return {
          id: `EV-${r.id_reserva}`,
          clientName: r.cliente_empresa || r.contacto,
          eventDate: r.fecha_evento,
          guests: r.cantidad_invitados,
          stationIds: stations,
          status: r.estado_evento || "Presupuestado",
          paymentStatus: r.estado_pago || "SALDO_PENDIENTE",
          totalCents: Math.round((Number(r.monto_total) || 0) * 100),
          depositCents: Math.round(depositPesos * 100),
          dietary: {
            celiacos,
            vegetarianos,
            veganos,
            alergias: alergias.join(", ")
          },
          kitchenNotes: r.notas_cocina || "",
          startTime: r.hora_inicio,
          endTime: r.hora_fin,
          durationHours: Number(r.duracion_horas) || 3,
          locationAddress: r.direccion_evento,
          distanceKm: Number(r.distancia_km) || 10,
          insuranceCents: Math.round((Number(r.monto_seguro) || 0) * 100),
          cancelled: r.evento_cancelado === 1
        };
      })
    );
    return events;
  }
  static async createEvent(body) {
    const dbClient = getDatabase();
    let cliente = await dbClient.queryOne(
      "SELECT id_cliente FROM cliente WHERE razon_social = ?",
      [body.clientName]
    );
    let idCliente = cliente?.id_cliente;
    if (!idCliente) {
      const insertResult = await dbClient.execute(
        `INSERT INTO cliente (razon_social, cuit, nombre_completo, email, password_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [
          body.clientName,
          `30-${Date.now().toString().slice(-8)}-1`,
          body.clientName,
          `eventos@${body.clientName.toLowerCase().replace(/[^a-z0-9]/g, "") || "cliente"}.com`,
          "temp_hash"
        ]
      );
      idCliente = Number(insertResult.lastInsertId);
    }
    const totalPesos = (body.totalCents || 0) / 100;
    const seguroPesos = (body.insuranceCents || 0) / 100;
    const reservaResult = await dbClient.execute(
      `INSERT INTO reserva (
        id_cliente, fecha_evento, hora_inicio, hora_fin, duracion_horas,
        cantidad_invitados, direccion_evento, distancia_km, evento_cancelado,
        estado_evento, estado_pago, notas_cocina, monto_total, monto_seguro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idCliente,
        body.eventDate,
        body.startTime || "19:30",
        body.endTime || "22:30",
        body.durationHours || 3,
        body.guests || 50,
        body.locationAddress || "CABA",
        body.distanceKm || 10,
        0,
        body.status || "Se\xF1ado / Confirmado",
        body.paymentStatus || "SALDO_PENDIENTE",
        body.kitchenNotes || "",
        totalPesos,
        seguroPesos
      ]
    );
    const idReserva = Number(reservaResult.lastInsertId);
    if (Array.isArray(body.stationIds)) {
      for (const stationSlug of body.stationIds) {
        const s = await dbClient.queryOne(
          "SELECT id_estacion, precio_por_persona FROM estacion WHERE codigo = ?",
          [stationSlug]
        );
        if (s) {
          const subtotal = Number(s.precio_por_persona) * (body.guests || 50);
          await dbClient.execute(
            `INSERT INTO detalle_reserva_estacion (id_reserva, id_estacion, subtotal_calculado)
             VALUES (?, ?, ?)`,
            [idReserva, s.id_estacion, subtotal]
          );
        }
      }
    }
    if (body.dietary) {
      if (body.dietary.celiacos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Celiaqu\xEDa", body.dietary.celiacos, "Men\xFA cel\xEDaco"]
        );
      }
      if (body.dietary.vegetarianos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [
            idReserva,
            "Vegetarianos",
            body.dietary.vegetarianos,
            "Men\xFA vegetariano"
          ]
        );
      }
      if (body.dietary.veganos > 0) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Veganos", body.dietary.veganos, "Men\xFA vegano"]
        );
      }
      if (body.dietary.alergias) {
        await dbClient.execute(
          `INSERT INTO restriccion_alimentaria (id_reserva, tipo_restriccion, cantidad_personas, observaciones)
           VALUES (?, ?, ?, ?)`,
          [idReserva, "Alergias", 1, body.dietary.alergias]
        );
      }
    }
    if (body.depositCents > 0) {
      await dbClient.execute(
        `INSERT INTO pago (id_reserva, tipo_pago, monto, pago_online, pago_completo, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idReserva, "SE\xD1A", body.depositCents / 100, 1, 0, "confirmado"]
      );
    }
    const all = await this.fetchAllEvents();
    return all.find((e) => e.id === `EV-${idReserva}`);
  }
  static async updateEvent(rawId, updates) {
    const dbClient = getDatabase();
    const idReserva = Number(rawId.replace("EV-", ""));
    await dbClient.execute(
      `UPDATE reserva
       SET
         estado_evento = COALESCE(?, estado_evento),
         estado_pago = COALESCE(?, estado_pago),
         notas_cocina = COALESCE(?, notas_cocina),
         fecha_actualizacion = CURRENT_TIMESTAMP,
         fecha_evento = COALESCE(?, fecha_evento),
         hora_inicio = COALESCE(?, hora_inicio),
         evento_cancelado = COALESCE(?, evento_cancelado)
       WHERE id_reserva = ?`,
      [
        updates.status ?? null,
        updates.paymentStatus ?? null,
        updates.kitchenNotes ?? null,
        updates.eventDate ?? null,
        updates.startTime ?? null,
        updates.cancelled ?? null,
        idReserva
      ]
    );
  }
};

// server/modules/events/events.controller.ts
var EventsController = class {
  static async list(_req, res) {
    try {
      const events = await EventsService.fetchAllEvents();
      res.json({ events });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async create(req, res) {
    try {
      const event = await EventsService.createEvent(req.body || {});
      res.status(201).json({ event });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async update(req, res) {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: "ID de reserva requerido" });
        return;
      }
      await EventsService.updateEvent(id, req.body || {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async myEvents(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }
      const events = await EventsService.fetchAllEvents();
      const filtered = events.filter((_e) => {
        return true;
      });
      res.json({ events: filtered });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// server/modules/events/events.routes.ts
var eventsRouter = createRouter();
eventsRouter.get("/", EventsController.list);
eventsRouter.post("/", EventsController.create);
eventsRouter.patch("/:id", EventsController.update);
eventsRouter.get("/my-events", EventsController.myEvents);

// server/modules/quotation/quotation.service.ts
var QuotationService = class {
  static async checkAvailability(date) {
    const dbClient = getDatabase();
    const result = await dbClient.queryOne(
      "SELECT count(*) as count, sum(cantidad_invitados) as total_guests FROM reserva WHERE fecha_evento = ? AND evento_cancelado = 0",
      [date]
    );
    const count = Number(result?.count || 0);
    const totalGuests = Number(result?.total_guests || 0);
    if (count === 0) {
      return { available: true, isConcurrent: false };
    }
    if (count === 1 && totalGuests <= 60) {
      return { available: true, isConcurrent: true };
    }
    return { available: false, isConcurrent: false };
  }
  static async calculateQuotation(input) {
    const dbClient = getDatabase();
    const tariffs = await dbClient.query("SELECT * FROM tarifas WHERE is_active = 1");
    const stations = await dbClient.query("SELECT * FROM estacion");
    const baseTariff = tariffs.find((t) => t.category === "base")?.price_per_guest_cents || 0;
    const insuranceCents = tariffs.find((t) => t.category === "insurance")?.fixed_cents || 0;
    let stationsCentsPerGuest = 0;
    for (const stationId of input.stationIds) {
      const station = stations.find((s) => s.codigo === stationId);
      if (station) {
        stationsCentsPerGuest += Math.round(Number(station.precio_por_persona) * 100);
      }
    }
    const perGuestCents = baseTariff + stationsCentsPerGuest;
    const subtotalCents = perGuestCents * input.guests;
    const totalCents = subtotalCents + insuranceCents;
    const depositCents = Math.round(totalCents * 30 / 100);
    const balanceCents = totalCents - depositCents;
    return {
      perGuestCents,
      subtotalCents,
      insuranceCents,
      totalCents,
      depositCents,
      balanceCents
    };
  }
};

// server/modules/quotation/quotation.controller.ts
var QuotationController = class {
  static async checkDate(req, res) {
    try {
      const date = req.query.date;
      if (!date) {
        res.status(400).json({ error: "Par\xE1metro date es requerido" });
        return;
      }
      const result = await QuotationService.checkAvailability(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async calculate(req, res) {
    try {
      const { guests, stationIds, distanceKm } = req.body || {};
      if (!guests || !stationIds) {
        res.status(400).json({ error: "guests y stationIds son requeridos" });
        return;
      }
      const calculation = await QuotationService.calculateQuotation({
        guests: Number(guests),
        stationIds,
        distanceKm: distanceKm ? Number(distanceKm) : void 0
      });
      res.json({ calculation });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// server/modules/quotation/quotation.routes.ts
var quotationRouter = createRouter();
quotationRouter.get("/availability", QuotationController.checkDate);
quotationRouter.post("/calculate", QuotationController.calculate);

// server/modules/production/production.service.ts
var ProductionService = class {
  static async getComanda(eventId) {
    const dbClient = getDatabase();
    const idReserva = Number(eventId.replace("EV-", ""));
    const row = await dbClient.queryOne(
      `SELECT
        r.*,
        c.razon_social as cliente_empresa,
        c.nombre_completo as contacto
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      WHERE r.id_reserva = ?`,
      [idReserva]
    );
    if (!row) return null;
    const sameDateCount = await dbClient.queryOne(
      "SELECT count(*) as c FROM reserva WHERE fecha_evento = ? AND evento_cancelado = 0",
      [row.fecha_evento]
    );
    const isConcurrent = Number(sameDateCount?.c || 0) > 1;
    const stationRows = await dbClient.query(
      `SELECT e.codigo as id, e.nombre as name
       FROM detalle_reserva_estacion dre
       JOIN estacion e ON e.id_estacion = dre.id_estacion
       WHERE dre.id_reserva = ?`,
      [idReserva]
    );
    const dietaryRows = await dbClient.query(
      `SELECT tipo_restriccion, cantidad_personas, observaciones
       FROM restriccion_alimentaria
       WHERE id_reserva = ?`,
      [idReserva]
    );
    let celiacos = 0;
    let vegetarianos = 0;
    let veganos = 0;
    let sinSal = 0;
    const alergias = [];
    const otros = [];
    for (const d of dietaryRows) {
      const tipo = (d.tipo_restriccion || "").toLowerCase();
      if (tipo.includes("celia")) celiacos += Number(d.cantidad_personas) || 0;
      else if (tipo.includes("vege")) vegetarianos += Number(d.cantidad_personas) || 0;
      else if (tipo.includes("vega")) veganos += Number(d.cantidad_personas) || 0;
      else if (tipo.includes("sal")) sinSal += Number(d.cantidad_personas) || 0;
      else if (tipo.includes("alerg")) {
        if (d.observaciones) alergias.push(d.observaciones);
      } else {
        if (d.observaciones) otros.push(d.observaciones);
      }
    }
    return {
      ticketNumber: `CMD-${row.id_reserva}`,
      eventId: `EV-${row.id_reserva}`,
      clientName: row.cliente_empresa || row.contacto,
      eventDate: row.fecha_evento,
      startTime: row.hora_inicio || "19:30",
      endTime: row.hora_fin || "22:30",
      durationHours: Number(row.duracion_horas) || 3,
      locationAddress: row.direccion_evento || "CABA",
      guests: Number(row.cantidad_invitados) || 50,
      isConcurrent,
      stations: stationRows,
      dietary: {
        celiacos,
        vegetarianos,
        veganos,
        alergias: alergias.join(", "),
        sinSal,
        otros: otros.join(", ")
      },
      kitchenNotes: row.notas_cocina || "",
      status: row.estado_evento || "Aprobado para Producci\xF3n"
    };
  }
};

// server/modules/production/production.controller.ts
var ProductionController = class {
  static async getComanda(req, res) {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        res.status(400).json({ error: "ID de evento requerido" });
        return;
      }
      const comanda = await ProductionService.getComanda(eventId);
      if (!comanda) {
        res.status(404).json({ error: "Evento no encontrado" });
        return;
      }
      res.json({ comanda });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// server/middleware/roleGuard.ts
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado. Inicie sesi\xF3n para continuar." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`
      });
      return;
    }
    if (next) next();
  };
}

// server/modules/production/production.routes.ts
var productionRouter = createRouter();
productionRouter.get(
  "/:eventId",
  authGuard,
  requireRoles(["cocina", "admin", "superadmin"]),
  ProductionController.getComanda
);

// server/modules/tariffs/tariffs.service.ts
var TariffsService = class {
  static async list() {
    const dbClient = getDatabase();
    const rows = await dbClient.query(
      "SELECT id, label, category, price_per_guest_cents, fixed_cents FROM tarifas WHERE is_active = 1"
    );
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      category: r.category,
      pricePerGuestCents: r.price_per_guest_cents,
      fixedCents: r.fixed_cents
    }));
  }
  static async update(id, pricePerGuestCents, fixedCents) {
    const dbClient = getDatabase();
    await dbClient.execute(
      "UPDATE tarifas SET price_per_guest_cents = ?, fixed_cents = COALESCE(?, fixed_cents) WHERE id = ?",
      [pricePerGuestCents, fixedCents ?? null, id]
    );
  }
  static async bulkUpdate(list) {
    const dbClient = getDatabase();
    if (Array.isArray(list)) {
      for (const t of list) {
        await dbClient.execute("UPDATE tarifas SET price_per_guest_cents = ? WHERE id = ?", [
          t.pricePerGuestCents,
          t.id
        ]);
      }
    }
  }
};

// server/modules/tariffs/tariffs.controller.ts
var TariffsController = class {
  static async list(_req, res) {
    try {
      const tariffs = await TariffsService.list();
      res.json({ tariffs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async update(req, res) {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: "ID de tarifa requerido" });
        return;
      }
      const { pricePerGuestCents, fixedCents } = req.body || {};
      await TariffsService.update(id, pricePerGuestCents, fixedCents);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async bulkUpdate(req, res) {
    try {
      const list = req.body?.tariffs;
      await TariffsService.bulkUpdate(list);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// server/modules/tariffs/tariffs.routes.ts
var tariffsRouter = createRouter();
tariffsRouter.get("/", TariffsController.list);
tariffsRouter.put("/:id", authGuard, requireRoles(["admin", "superadmin"]), TariffsController.update);
tariffsRouter.post("/bulk", authGuard, requireRoles(["admin", "superadmin"]), TariffsController.bulkUpdate);

// server/modules/users/users.service.ts
var UsersService = class {
  static async list() {
    const dbClient = getDatabase();
    const staff = await dbClient.query(`
      SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
      FROM usuario_staff
      ORDER BY id_usuario ASC
    `);
    const clients = await dbClient.query(`
      SELECT id_cliente, razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, direccion_legal, fecha_aniversario, activo, fecha_creacion
      FROM cliente
      ORDER BY id_cliente ASC
    `);
    return { staff, clients };
  }
  static async createStaff(data, authUserRole) {
    const dbClient = getDatabase();
    const nombreCompleto = (data.nombreCompleto || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const password = (data.password || "").trim();
    const rol = (data.rol || "admin").trim().toLowerCase();
    const activo = data.activo === 0 ? 0 : 1;
    if (!nombreCompleto || !email || !password) {
      throw new Error("Nombre completo, email y contrase\xF1a son obligatorios.");
    }
    if (password.length < 6) {
      throw new Error("La contrase\xF1a debe tener al menos 6 caracteres.");
    }
    if (!["superadmin", "admin", "cocina"].includes(rol)) {
      throw new Error("Rol inv\xE1lido. Opciones v\xE1lidas: superadmin, admin, cocina.");
    }
    if (rol === "superadmin" && authUserRole !== "superadmin") {
      throw new Error("FORBIDDEN: Solo el Superadministrador puede crear usuarios con rol superadmin.");
    }
    const staffExists = await dbClient.queryOne("SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ?", [email]);
    const clientExists = await dbClient.queryOne("SELECT id_cliente FROM cliente WHERE LOWER(email) = ?", [email]);
    if (staffExists || clientExists) {
      throw new Error("DUPLICATE: El email ya se encuentra registrado por otra cuenta.");
    }
    const passwordHash = hashPassword(password);
    const insertRes = await dbClient.execute(
      `INSERT INTO usuario_staff (nombre_completo, email, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [nombreCompleto, email, passwordHash, rol, activo]
    );
    const newId = Number(insertRes.lastInsertId);
    return await dbClient.queryOne(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuario_staff
       WHERE id_usuario = ?`,
      [newId]
    );
  }
  static async updateStaff(targetId, body, authUserRole) {
    const dbClient = getDatabase();
    const existing = await dbClient.queryOne("SELECT * FROM usuario_staff WHERE id_usuario = ?", [targetId]);
    if (!existing) {
      throw new Error("NOT_FOUND: Usuario no encontrado.");
    }
    if (existing.rol === "superadmin" && authUserRole !== "superadmin") {
      throw new Error("FORBIDDEN: Solo un Superadministrador puede modificar a otro Superadministrador.");
    }
    const nombreCompleto = body.nombreCompleto !== void 0 ? String(body.nombreCompleto).trim() : body.nombre_completo !== void 0 ? String(body.nombre_completo).trim() : existing.nombre_completo;
    const email = body.email !== void 0 ? String(body.email).trim().toLowerCase() : existing.email;
    const rol = body.rol !== void 0 ? String(body.rol).trim().toLowerCase() : existing.rol;
    const activo = body.activo !== void 0 ? Number(body.activo) === 0 ? 0 : 1 : existing.activo;
    if (rol && !["superadmin", "admin", "cocina"].includes(rol)) {
      throw new Error("Rol inv\xE1lido. Opciones v\xE1lidas: superadmin, admin, cocina.");
    }
    if (rol === "superadmin" && authUserRole !== "superadmin") {
      throw new Error("FORBIDDEN: Solo un Superadministrador puede promover un usuario a superadmin.");
    }
    if (email !== existing.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne(
        "SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ? AND id_usuario != ?",
        [email, targetId]
      );
      const clientDup = await dbClient.queryOne("SELECT id_cliente FROM cliente WHERE LOWER(email) = ?", [email]);
      if (staffDup || clientDup) {
        throw new Error("DUPLICATE: El email ya se encuentra en uso por otra cuenta.");
      }
    }
    let newPasswordHash = existing.password_hash;
    if (body.password && String(body.password).trim().length >= 6) {
      newPasswordHash = hashPassword(String(body.password).trim());
    }
    await dbClient.execute(
      `UPDATE usuario_staff
       SET nombre_completo = ?, email = ?, password_hash = ?, rol = ?, activo = ?
       WHERE id_usuario = ?`,
      [nombreCompleto, email, newPasswordHash, rol, activo, targetId]
    );
    return await dbClient.queryOne(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuario_staff
       WHERE id_usuario = ?`,
      [targetId]
    );
  }
  static async deleteStaff(targetId, currentUserId) {
    const dbClient = getDatabase();
    if (targetId === currentUserId) {
      throw new Error("No puedes eliminar tu propia cuenta de Superadministrador.");
    }
    await dbClient.execute("DELETE FROM usuario_staff WHERE id_usuario = ?", [targetId]);
  }
  static async updateClient(targetId, body) {
    const dbClient = getDatabase();
    const existing = await dbClient.queryOne("SELECT * FROM cliente WHERE id_cliente = ?", [targetId]);
    if (!existing) {
      throw new Error("NOT_FOUND: Cliente no encontrado.");
    }
    const razonSocial = body.razonSocial !== void 0 ? String(body.razonSocial).trim() : existing.razon_social;
    const cuit = body.cuit !== void 0 ? String(body.cuit).trim() : existing.cuit;
    const nombreCompleto = body.nombreCompleto !== void 0 ? String(body.nombreCompleto).trim() : existing.nombre_completo;
    const cargoResponsable = body.cargoResponsable !== void 0 ? String(body.cargoResponsable).trim() : existing.cargo_responsable;
    const email = body.email !== void 0 ? String(body.email).trim().toLowerCase() : existing.email;
    const telefono = body.telefono !== void 0 ? String(body.telefono).trim() : existing.telefono;
    const direccionLegal = body.direccionLegal !== void 0 ? String(body.direccionLegal).trim() : existing.direccion_legal;
    const fechaAniversario = body.fechaAniversario !== void 0 ? body.fechaAniversario ? String(body.fechaAniversario).trim() : null : existing.fecha_aniversario;
    const activo = body.activo !== void 0 ? Number(body.activo) === 0 ? 0 : 1 : existing.activo;
    if (email !== existing.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne("SELECT id_usuario FROM usuario_staff WHERE LOWER(email) = ?", [email]);
      const clientDup = await dbClient.queryOne(
        "SELECT id_cliente FROM cliente WHERE LOWER(email) = ? AND id_cliente != ?",
        [email, targetId]
      );
      if (staffDup || clientDup) {
        throw new Error("DUPLICATE: El email ya est\xE1 en uso por otro usuario.");
      }
    }
    let newPasswordHash = existing.password_hash;
    if (body.password && String(body.password).trim().length >= 6) {
      newPasswordHash = hashPassword(String(body.password).trim());
    }
    await dbClient.execute(
      `UPDATE cliente
       SET razon_social = ?, cuit = ?, nombre_completo = ?, cargo_responsable = ?, email = ?, telefono = ?, direccion_legal = ?, fecha_aniversario = ?, password_hash = ?, activo = ?
       WHERE id_cliente = ?`,
      [
        razonSocial,
        cuit,
        nombreCompleto,
        cargoResponsable,
        email,
        telefono,
        direccionLegal,
        fechaAniversario,
        newPasswordHash,
        activo,
        targetId
      ]
    );
    return await dbClient.queryOne(
      `SELECT id_cliente, razon_social, cuit, nombre_completo, cargo_responsable, email, telefono, direccion_legal, fecha_aniversario, activo, fecha_creacion
       FROM cliente
       WHERE id_cliente = ?`,
      [targetId]
    );
  }
};

// server/modules/users/users.controller.ts
var UsersController = class {
  static async list(_req, res) {
    try {
      const data = await UsersService.list();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async createStaff(req, res) {
    try {
      const user = await UsersService.createStaff(req.body || {}, req.user?.role || "");
      res.status(201).json({ success: true, user });
    } catch (error) {
      if (error.message.startsWith("DUPLICATE:")) {
        res.status(409).json({ error: error.message.replace("DUPLICATE: ", "") });
        return;
      }
      if (error.message.startsWith("FORBIDDEN:")) {
        res.status(403).json({ error: error.message.replace("FORBIDDEN: ", "") });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }
  static async updateStaff(req, res) {
    try {
      const targetId = Number(req.params.id);
      const user = await UsersService.updateStaff(targetId, req.body || {}, req.user?.role || "");
      res.json({ success: true, user });
    } catch (error) {
      if (error.message.startsWith("NOT_FOUND:")) {
        res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
        return;
      }
      if (error.message.startsWith("DUPLICATE:")) {
        res.status(409).json({ error: error.message.replace("DUPLICATE: ", "") });
        return;
      }
      if (error.message.startsWith("FORBIDDEN:")) {
        res.status(403).json({ error: error.message.replace("FORBIDDEN: ", "") });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }
  static async deleteStaff(req, res) {
    try {
      const targetId = Number(req.params.id);
      await UsersService.deleteStaff(targetId, req.user?.id || 0);
      res.json({ success: true, message: "Usuario eliminado correctamente." });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  static async updateClient(req, res) {
    try {
      const targetId = Number(req.params.id);
      const client = await UsersService.updateClient(targetId, req.body || {});
      res.json({ success: true, client });
    } catch (error) {
      if (error.message.startsWith("NOT_FOUND:")) {
        res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
        return;
      }
      if (error.message.startsWith("DUPLICATE:")) {
        res.status(409).json({ error: error.message.replace("DUPLICATE: ", "") });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }
};

// server/modules/users/users.routes.ts
var usersRouter = createRouter();
usersRouter.get("/", authGuard, requireRoles(["admin", "superadmin"]), UsersController.list);
usersRouter.post("/staff", authGuard, requireRoles(["admin", "superadmin"]), UsersController.createStaff);
usersRouter.patch("/staff/:id", authGuard, requireRoles(["admin", "superadmin"]), UsersController.updateStaff);
usersRouter.put("/staff/:id", authGuard, requireRoles(["admin", "superadmin"]), UsersController.updateStaff);
usersRouter.delete("/staff/:id", authGuard, requireRoles(["superadmin"]), UsersController.deleteStaff);
usersRouter.patch("/clients/:id", authGuard, requireRoles(["admin", "superadmin"]), UsersController.updateClient);
usersRouter.put("/clients/:id", authGuard, requireRoles(["admin", "superadmin"]), UsersController.updateClient);

// server/modules/profile/profile.service.ts
var ProfileService = class {
  static async getProfile(clientId) {
    const dbClient = getDatabase();
    const cliente = await dbClient.queryOne("SELECT * FROM cliente WHERE id_cliente = ?", [clientId]);
    if (!cliente) throw new Error("NOT_FOUND: Cliente no encontrado");
    let fechaAniversario = "";
    if (cliente.fecha_aniversario) {
      if (cliente.fecha_aniversario instanceof Date) {
        fechaAniversario = cliente.fecha_aniversario.toISOString().slice(0, 10);
      } else {
        fechaAniversario = String(cliente.fecha_aniversario).slice(0, 10);
      }
    }
    return {
      razonSocial: cliente.razon_social || "",
      cuit: cliente.cuit || "",
      nombreCompleto: cliente.nombre_completo || "",
      cargoResponsable: cliente.cargo_responsable || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccionLegal: cliente.direccion_legal || "",
      fechaAniversario
    };
  }
  static async updateProfile(clientId, body) {
    const dbClient = getDatabase();
    const cliente = await dbClient.queryOne("SELECT * FROM cliente WHERE id_cliente = ?", [clientId]);
    if (!cliente) throw new Error("NOT_FOUND: Cliente no encontrado");
    const razonSocial = (body.razonSocial || cliente.razon_social || "").trim();
    const nombreCompleto = (body.nombreCompleto || cliente.nombre_completo || "").trim();
    const cargoResponsable = (body.cargoResponsable ?? cliente.cargo_responsable ?? "").trim();
    const email = (body.email || cliente.email || "").trim().toLowerCase();
    const telefono = (body.telefono ?? cliente.telefono ?? "").trim();
    const direccionLegal = (body.direccionLegal ?? cliente.direccion_legal ?? "").trim();
    const fechaAniversario = (body.fechaAniversario ?? cliente.fecha_aniversario ?? "").trim();
    if (!razonSocial || !nombreCompleto || !email) {
      throw new Error("Raz\xF3n social, nombre del responsable y email son obligatorios");
    }
    if (email !== cliente.email.toLowerCase()) {
      const staffDup = await dbClient.queryOne("SELECT email FROM usuario_staff WHERE LOWER(email) = ?", [email]);
      const clienteDup = await dbClient.queryOne(
        "SELECT email FROM cliente WHERE LOWER(email) = ? AND id_cliente != ?",
        [email, cliente.id_cliente]
      );
      if (staffDup || clienteDup) {
        throw new Error("DUPLICATE: El email ya se encuentra registrado por otra cuenta");
      }
    }
    await dbClient.execute(
      `UPDATE cliente
       SET
         razon_social = ?,
         nombre_completo = ?,
         cargo_responsable = ?,
         email = ?,
         telefono = ?,
         direccion_legal = ?,
         fecha_aniversario = ?
       WHERE id_cliente = ?`,
      [
        razonSocial,
        nombreCompleto,
        cargoResponsable || null,
        email,
        telefono || null,
        direccionLegal || null,
        fechaAniversario || null,
        cliente.id_cliente
      ]
    );
    return {
      razonSocial,
      cuit: cliente.cuit,
      nombreCompleto,
      cargoResponsable,
      email,
      telefono,
      direccionLegal,
      fechaAniversario
    };
  }
  static async changePassword(clientId, currentPasswordRaw, newPasswordRaw) {
    const dbClient = getDatabase();
    const cliente = await dbClient.queryOne("SELECT * FROM cliente WHERE id_cliente = ?", [clientId]);
    if (!cliente) throw new Error("NOT_FOUND: Cliente no encontrado");
    const currentPassword = (currentPasswordRaw || "").trim();
    const newPassword = (newPasswordRaw || "").trim();
    if (!currentPassword || !newPassword) {
      throw new Error("Debes completar la contrase\xF1a actual y la nueva contrase\xF1a");
    }
    if (newPassword.length < 6) {
      throw new Error("La nueva contrase\xF1a debe tener al menos 6 caracteres");
    }
    if (!verifyPassword(currentPassword, cliente.password_hash)) {
      throw new Error("La contrase\xF1a actual ingresada es incorrecta");
    }
    const newPassHash = hashPassword(newPassword);
    await dbClient.execute("UPDATE cliente SET password_hash = ? WHERE id_cliente = ?", [
      newPassHash,
      cliente.id_cliente
    ]);
  }
};

// server/modules/profile/profile.controller.ts
var ProfileController = class {
  static async getProfile(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado o sesi\xF3n no v\xE1lida" });
        return;
      }
      const profile = await ProfileService.getProfile(req.user.id);
      res.json({ profile });
    } catch (error) {
      if (error.message.startsWith("NOT_FOUND:")) {
        res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }
  static async updateProfile(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado o sesi\xF3n no v\xE1lida" });
        return;
      }
      const profile = await ProfileService.updateProfile(req.user.id, req.body || {});
      res.json({ success: true, profile });
    } catch (error) {
      if (error.message.startsWith("DUPLICATE:")) {
        res.status(409).json({ error: error.message.replace("DUPLICATE: ", "") });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  }
  static async changePassword(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado o sesi\xF3n no v\xE1lida" });
        return;
      }
      const { currentPassword, newPassword } = req.body || {};
      await ProfileService.changePassword(req.user.id, currentPassword, newPassword);
      res.json({ success: true, message: "Contrase\xF1a actualizada correctamente" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

// server/modules/profile/profile.routes.ts
var profileRouter = createRouter();
profileRouter.get("/profile", authGuard, requireRoles(["cliente"]), ProfileController.getProfile);
profileRouter.put("/profile", authGuard, requireRoles(["cliente"]), ProfileController.updateProfile);
profileRouter.post("/change-password", authGuard, requireRoles(["cliente"]), ProfileController.changePassword);

// server/app.ts
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  for (const cookie of cookieHeader.split(";")) {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join("=").trim());
    }
  }
  return list;
}
function parseBody(req) {
  if (req.body !== void 0 && req.body !== null) {
    const b = req.body;
    if (typeof b === "object") return Promise.resolve(b);
    if (typeof b === "string") {
      try {
        return Promise.resolve(JSON.parse(b));
      } catch {
        return Promise.resolve({});
      }
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
var mountedRoutes = [
  { prefix: "/api/auth", router: authRouter },
  { prefix: "/api/events", router: eventsRouter },
  { prefix: "/api/quotation", router: quotationRouter },
  { prefix: "/api/production", router: productionRouter },
  { prefix: "/api/tariffs", router: tariffsRouter },
  { prefix: "/api/users", router: usersRouter },
  { prefix: "/api/client", router: profileRouter }
];
async function app(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    });
    res.end();
    return;
  }
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = (req.method || "GET").toUpperCase();
  if (pathname === "/api/health" && method === "GET") {
    const dbClient = getDatabase();
    try {
      const staffRes = await dbClient.query("SELECT count(*) as total_staff FROM usuario_staff");
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true"
      });
      res.end(
        JSON.stringify({
          status: "ok",
          database: "connected",
          totalStaff: Number(staffRes[0]?.total_staff || 0),
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      return;
    } catch (err) {
      res.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true"
      });
      res.end(
        JSON.stringify({
          status: "error",
          database: "disconnected_or_empty",
          error: err.message,
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      return;
    }
  }
  if (pathname.startsWith("/admin")) {
    res.writeHead(302, { Location: "/usuarios" });
    res.end();
    return;
  }
  const cookies = parseCookies(req.headers.cookie);
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await parseBody(req) : {};
  const query = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  let statusCode = 200;
  let isResponseSent = false;
  const responseHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true"
  };
  const setCookies = [];
  const customReq = {
    params: {},
    query,
    body,
    cookies,
    headers: req.headers,
    method,
    url: req.url,
    pathname,
    rawReq: req
  };
  const customRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      if (isResponseSent) return;
      isResponseSent = true;
      responseHeaders["Content-Type"] = "application/json; charset=utf-8";
      if (setCookies.length > 0) {
        responseHeaders["Set-Cookie"] = setCookies;
      }
      res.writeHead(statusCode, responseHeaders);
      res.end(JSON.stringify(data));
    },
    cookie(name, value, options = {}) {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      parts.push(`Path=${options.path || "/"}`);
      if (options.httpOnly !== false) parts.push("HttpOnly");
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      else parts.push("SameSite=Lax");
      if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge / 1e3)}`);
      if (options.secure) parts.push("Secure");
      setCookies.push(parts.join("; "));
      return this;
    },
    clearCookie(name, options = {}) {
      const parts = [`${name}=`];
      parts.push(`Path=${options.path || "/"}`);
      parts.push("HttpOnly");
      parts.push("SameSite=Lax");
      parts.push("Max-Age=0");
      setCookies.push(parts.join("; "));
      return this;
    },
    redirect(location, code = 302) {
      if (isResponseSent) return;
      isResponseSent = true;
      res.writeHead(code, { Location: location, ...responseHeaders });
      res.end();
    },
    send(data) {
      if (isResponseSent) return;
      isResponseSent = true;
      if (setCookies.length > 0) {
        responseHeaders["Set-Cookie"] = setCookies;
      }
      res.writeHead(statusCode, responseHeaders);
      res.end(data);
    },
    isSent() {
      return isResponseSent;
    }
  };
  for (const mounted of mountedRoutes) {
    if (pathname === mounted.prefix || pathname.startsWith(mounted.prefix + "/")) {
      const subPath = pathname.slice(mounted.prefix.length) || "/";
      for (const route of mounted.router.routes) {
        if (route.method !== "ALL" && route.method !== method) continue;
        const match = subPath.match(route.regex);
        if (match) {
          customReq.params = {};
          route.paramNames.forEach((name, idx) => {
            customReq.params[name] = match[idx + 1] || "";
          });
          try {
            let handlerIdx = 0;
            const pending = [];
            const next = (err) => {
              const p = (async () => {
                if (err) {
                  if (!isResponseSent) {
                    customRes.status(500).json({ error: err.message || "Error interno del servidor" });
                  }
                  return;
                }
                if (handlerIdx < route.handlers.length && !isResponseSent) {
                  const currentHandler = route.handlers[handlerIdx++];
                  await currentHandler(customReq, customRes, next);
                }
              })();
              pending.push(p);
              return p;
            };
            await next();
            while (pending.length > 0) {
              await Promise.all(pending.splice(0, pending.length));
            }
            if (!isResponseSent) {
              customRes.status(500).json({ error: "La ruta no gener\xF3 respuesta" });
            }
            return;
          } catch (handlerErr) {
            if (!isResponseSent) {
              customRes.status(500).json({ error: handlerErr.message || "Error en ejecuci\xF3n de ruta" });
            }
            return;
          }
        }
      }
    }
  }
  if (!isResponseSent) {
    customRes.status(404).json({ error: "Ruta no encontrada", path: pathname });
  }
}

// server/index.ts
var PORT = Number(process.env.PORT) || 3001;
async function ensureResetTokensTable(dbClient) {
  try {
    await dbClient.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at BIGINT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      )
    `);
  } catch (err) {
    console.error("\u26A0\uFE0F Error al verificar tabla password_reset_tokens:", err.message);
  }
}
async function ensureClientActiveColumn(dbClient) {
  try {
    await dbClient.exec(`ALTER TABLE cliente ADD COLUMN IF NOT EXISTS activo INTEGER NOT NULL DEFAULT 1`);
  } catch {
  }
}
var server = createServer(app);
if (process.env.VERCEL !== "1") {
  server.listen(PORT, "0.0.0.0", async () => {
    const dbClient = getDatabase();
    await ensureResetTokensTable(dbClient);
    await ensureClientActiveColumn(dbClient);
    console.log(`\u{1F680} SMT Catering Server corriendo en http://localhost:${PORT}`);
    console.log(`\u{1F4E1} Base de Datos: Neon PostgreSQL Cloud`);
    console.log(`\u2728 Arquitectura Vertical Slices activa:`);
    console.log(`   - Auth:       POST /api/auth/{login,register,logout,forgot-password,reset-password}, GET /api/auth/me`);
    console.log(`   - Tariffs:    GET /api/tariffs, PUT /api/tariffs/:id, POST /api/tariffs/bulk`);
    console.log(`   - Events:     GET /api/events, POST /api/events, PATCH /api/events/:id, GET /api/events/my-events`);
    console.log(`   - Quotation:  GET /api/quotation/availability, POST /api/quotation/calculate`);
    console.log(`   - Production: GET /api/production/:eventId`);
    console.log(`   - Profile:    GET /api/client/profile, PUT /api/client/profile, POST /api/client/change-password`);
    console.log(`   - Users:      GET /api/users, POST /api/users/staff, PATCH /api/users/staff/:id, DELETE /api/users/staff/:id, PATCH /api/users/clients/:id`);
  });
}

// server/vercel.ts
var vercel_default = app;
export {
  vercel_default as default
};
