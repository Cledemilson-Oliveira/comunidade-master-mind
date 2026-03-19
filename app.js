const SUPABASE_URL = "https://bqskqjygbrkskqxurpir.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_htJYZHMv236djJoNWD2Ivw_DA_Eh8hu";

const state = {
  currentUser: null,
  currentProfile: null,
  currentRoute: "inicio",
};

let supabaseClient = null;
if (SUPABASE_URL !== "COLE_AQUI_SUA_SUPABASE_URL" && SUPABASE_ANON_KEY !== "COLE_AQUI_SUA_SUPABASE_ANON_KEY") {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const routes = document.querySelectorAll("[data-route]");
const views = document.querySelectorAll(".view");
const authModal = document.getElementById("authModal");
const openAuthBtn = document.getElementById("openAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const toast = document.getElementById("toast");

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

function requireSupabase() {
  if (!supabaseClient) {
    showToast("Configure sua SUPABASE_URL e sua SUPABASE_ANON_KEY no arquivo app.js.", "error");
    throw new Error("Supabase não configurado");
  }
}

function formatDigits(value) {
  return (value || "").replace(/\D/g, "");
}

function initials(name = "MM") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "MM";
}

function setRoute(route) {
  state.currentRoute = route;
  views.forEach((view) => {
    const match = view.id === route;
    view.classList.toggle("hidden", !match);
    view.classList.toggle("active", match);
  });
  routes.forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  window.location.hash = route;
}

routes.forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    const route = element.dataset.route;
    if (route === "vip" && !hasVipAccess()) {
      setRoute("vip");
      renderVipGate();
      return;
    }
    if (route === "admin" && !isAdmin()) {
      setRoute("admin");
      renderAdminGate();
      return;
    }
    setRoute(route);
  });
});

function openAuth(tab = "login") {
  authModal.classList.remove("hidden");
  switchAuthTab(tab);
}

function closeAuth() {
  authModal.classList.add("hidden");
}

openAuthBtn.addEventListener("click", () => openAuth("login"));
document.querySelectorAll("[data-open-auth]").forEach((button) => {
  button.addEventListener("click", () => openAuth(button.dataset.openAuth || "cadastro"));
});
document.querySelectorAll("[data-close-auth]").forEach((element) => {
  element.addEventListener("click", closeAuth);
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
});

function switchAuthTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.authTab === tab));
  document.getElementById("loginPane").classList.toggle("hidden", tab !== "login");
  document.getElementById("registerPane").classList.toggle("hidden", tab !== "cadastro");
}

function isAdmin() {
  return state.currentProfile?.role === "admin";
}

function hasVipAccess() {
  const access = state.currentProfile?.access_level;
  return access === "vip" || isAdmin();
}

function hasMemberAccess() {
  return !!state.currentUser;
}

function renderProfile() {
  const profile = state.currentProfile;
  document.getElementById("profileNome").textContent = profile?.full_name || "Visitante";
  document.getElementById("profileEmail").textContent = profile?.email || "Entre para acessar sua área.";
  document.getElementById("profileAccess").textContent = profile?.access_level || "publico";
  document.getElementById("profileWhatsapp").textContent = profile?.whatsapp || "-";
  document.getElementById("profileStatus").textContent = profile?.member_status || "-";
  document.getElementById("profileRole").textContent = profile?.role || "visitante";
  document.getElementById("memberAvatar").textContent = initials(profile?.full_name || "MM");

  logoutBtn.classList.toggle("hidden", !state.currentUser);
  openAuthBtn.classList.toggle("hidden", !!state.currentUser);

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", !isAdmin());
  });

  renderVipGate();
  renderAdminGate();
}

function renderVipGate() {
  document.getElementById("vipLocked").classList.toggle("hidden", hasVipAccess());
  document.getElementById("vipContent").classList.toggle("hidden", !hasVipAccess());
}

function renderAdminGate() {
  document.getElementById("adminLocked").classList.toggle("hidden", isAdmin());
  document.getElementById("adminContent").classList.toggle("hidden", !isAdmin());
}

async function fetchProfile(userId) {
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, whatsapp, cpf, access_level, role, member_status")
    .eq("id", userId)
    .single();

  if (error) {
    showToast("Não foi possível carregar o perfil.", "error");
    return null;
  }
  return data;
}

async function handleRegister(event) {
  event.preventDefault();
  requireSupabase();

  const full_name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const whatsapp = formatDigits(document.getElementById("registerWhatsapp").value);
  const cpf = formatDigits(document.getElementById("registerCpf").value);
  const password = document.getElementById("registerPassword").value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    showToast(error.message, "error");
    return;
  }

  const user = data.user;
  if (!user) {
    showToast("Cadastro criado, mas o usuário não foi retornado.", "error");
    return;
  }

  const { error: profileError } = await supabaseClient.from("profiles").insert({
    id: user.id,
    full_name,
    email,
    whatsapp,
    cpf,
    access_level: "iniciante",
    role: "member",
    member_status: "ativo",
  });

  if (profileError) {
    showToast(profileError.message, "error");
    return;
  }

  showToast("Cadastro realizado com sucesso. Agora faça seu login.", "success");
  event.target.reset();
  switchAuthTab("login");
}

async function handleLogin(event) {
  event.preventDefault();
  requireSupabase();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showToast(error.message, "error");
    return;
  }

  state.currentUser = data.user;
  state.currentProfile = await fetchProfile(data.user.id);
  renderProfile();
  closeAuth();
  showToast("Login realizado com sucesso.", "success");
  document.getElementById("loginForm").reset();
  await hydrateData();
  setRoute("membros");
}

async function handleLogout() {
  requireSupabase();
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast(error.message, "error");
    return;
  }
  state.currentUser = null;
  state.currentProfile = null;
  renderProfile();
  showToast("Você saiu da conta.", "success");
  setRoute("inicio");
  await hydrateData();
}

async function loadProducts() {
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, title, description, price_label, checkout_url, support_whatsapp, seller_name, status")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  const productsList = document.getElementById("productsList");
  if (error) {
    productsList.innerHTML = `<div class="empty-state">Erro ao carregar produtos.</div>`;
    return;
  }

  if (!data.length) {
    productsList.innerHTML = `<div class="empty-state">Nenhum produto ativo no momento.</div>`;
    return;
  }

  productsList.innerHTML = data.map((item) => `
    <article class="product-card">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description)}</p>
      <div class="price">${escapeHtml(item.price_label)}</div>
      <div class="product-meta">
        <span class="meta-badge">Membro: ${escapeHtml(item.seller_name || "Comunidade")}</span>
        <span class="meta-badge">Suporte: ${escapeHtml(item.support_whatsapp || "-")}</span>
      </div>
      <div class="product-actions">
        <a class="btn btn-primary" href="${item.checkout_url}" target="_blank" rel="noopener noreferrer">Ir para checkout</a>
        ${item.support_whatsapp ? `<a class="btn btn-secondary" href="https://wa.me/${item.support_whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
      </div>
    </article>
  `).join("");
}

async function loadPosts() {
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("community_posts")
    .select("id, title, content, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const postsList = document.getElementById("postsList");
  if (error) {
    postsList.innerHTML = `<div class="empty-state">Erro ao carregar publicações.</div>`;
    return;
  }

  if (!data.length) {
    postsList.innerHTML = `<div class="empty-state">Nenhuma publicação ainda.</div>`;
    return;
  }

  postsList.innerHTML = data.map((item) => `
    <article class="post-card">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.content)}</p>
      <div class="post-meta">
        <span class="meta-badge">Autor: ${escapeHtml(item.author_name || "Membro")}</span>
        <span class="meta-badge">${new Date(item.created_at).toLocaleString("pt-BR")}</span>
      </div>
    </article>
  `).join("");
}

function materialVisibleForUser(visibility) {
  if (visibility === "publico") return true;
  if (visibility === "membro") return hasMemberAccess();
  if (visibility === "vip") return hasVipAccess();
  return false;
}

async function loadMaterials() {
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("materials")
    .select("id, title, description, link_url, visibility, created_at")
    .order("created_at", { ascending: false });

  const materialsList = document.getElementById("materialsList");
  if (error) {
    materialsList.innerHTML = `<div class="empty-state">Erro ao carregar materiais.</div>`;
    return;
  }

  const filtered = data.filter((item) => materialVisibleForUser(item.visibility));
  if (!filtered.length) {
    materialsList.innerHTML = `<div class="empty-state">Nenhum material disponível para seu nível de acesso.</div>`;
    return;
  }

  materialsList.innerHTML = filtered.map((item) => `
    <article class="material-card">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description)}</p>
      <div class="material-meta">
        <span class="meta-badge">Visibilidade: ${escapeHtml(item.visibility)}</span>
        <span class="meta-badge">${new Date(item.created_at).toLocaleString("pt-BR")}</span>
      </div>
      <div class="product-actions">
        <a class="btn btn-primary" href="${item.link_url}" target="_blank" rel="noopener noreferrer">Abrir material</a>
      </div>
    </article>
  `).join("");
}

async function loadMembers() {
  if (!isAdmin()) return;
  requireSupabase();
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, access_level, role, member_status")
    .order("created_at", { ascending: false });

  const membersList = document.getElementById("membersList");
  if (error) {
    membersList.innerHTML = `<div class="empty-state">Erro ao carregar membros.</div>`;
    return;
  }

  if (!data.length) {
    membersList.innerHTML = `<div class="empty-state">Nenhum membro encontrado.</div>`;
    return;
  }

  membersList.innerHTML = data.map((member) => `
    <article class="member-row">
      <div>
        <strong>${escapeHtml(member.full_name || "Sem nome")}</strong>
        <p>${escapeHtml(member.email || "-")}</p>
      </div>
      <div class="member-meta"><span class="meta-badge">${escapeHtml(member.member_status || "-")}</span></div>
      <select data-member-id="${member.id}" data-type="access">
        <option value="iniciante" ${member.access_level === "iniciante" ? "selected" : ""}>iniciante</option>
        <option value="vip" ${member.access_level === "vip" ? "selected" : ""}>vip</option>
      </select>
      <select data-member-id="${member.id}" data-type="role">
        <option value="member" ${member.role === "member" ? "selected" : ""}>member</option>
        <option value="admin" ${member.role === "admin" ? "selected" : ""}>admin</option>
      </select>
      <div class="member-actions">
        <button class="btn btn-small" data-save-member="${member.id}">Salvar</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-save-member]").forEach((button) => {
    button.addEventListener("click", async () => {
      const memberId = button.dataset.saveMember;
      const access = document.querySelector(`select[data-member-id="${memberId}"][data-type="access"]`).value;
      const role = document.querySelector(`select[data-member-id="${memberId}"][data-type="role"]`).value;
      await updateMemberAccess(memberId, access, role);
    });
  });
}

async function updateMemberAccess(memberId, accessLevel, role) {
  requireSupabase();
  const { error } = await supabaseClient
    .from("profiles")
    .update({ access_level: accessLevel, role })
    .eq("id", memberId);

  if (error) {
    showToast(error.message, "error");
    return;
  }
  showToast("Membro atualizado com sucesso.", "success");
  if (state.currentUser?.id === memberId) {
    state.currentProfile = await fetchProfile(memberId);
    renderProfile();
  }
  await loadMembers();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  requireSupabase();
  if (!hasMemberAccess()) {
    showToast("Faça login para publicar no mural.", "error");
    openAuth("login");
    return;
  }

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const { error } = await supabaseClient.from("community_posts").insert({
    user_id: state.currentUser.id,
    author_name: state.currentProfile?.full_name || "Membro",
    title,
    content,
  });

  if (error) {
    showToast(error.message, "error");
    return;
  }

  event.target.reset();
  showToast("Publicação enviada com sucesso.", "success");
  await loadPosts();
}

async function handleProductSubmit(event) {
  event.preventDefault();
  requireSupabase();
  if (!isAdmin()) {
    showToast("Somente admin pode cadastrar produtos.", "error");
    return;
  }

  const payload = {
    title: document.getElementById("productTitle").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    price_label: document.getElementById("productPrice").value.trim(),
    checkout_url: document.getElementById("productCheckout").value.trim(),
    support_whatsapp: formatDigits(document.getElementById("productWhatsapp").value),
    seller_name: document.getElementById("productSellerName").value.trim(),
    status: document.getElementById("productStatus").value,
    created_by: state.currentUser.id,
  };

  const { error } = await supabaseClient.from("products").insert(payload);
  if (error) {
    showToast(error.message, "error");
    return;
  }

  event.target.reset();
  showToast("Produto cadastrado com sucesso.", "success");
  await loadProducts();
}

async function handleMaterialSubmit(event) {
  event.preventDefault();
  requireSupabase();
  if (!isAdmin()) {
    showToast("Somente admin pode cadastrar materiais.", "error");
    return;
  }

  const payload = {
    title: document.getElementById("materialTitle").value.trim(),
    description: document.getElementById("materialDescription").value.trim(),
    link_url: document.getElementById("materialLink").value.trim(),
    visibility: document.getElementById("materialVisibility").value,
    created_by: state.currentUser.id,
  };

  const { error } = await supabaseClient.from("materials").insert(payload);
  if (error) {
    showToast(error.message, "error");
    return;
  }

  event.target.reset();
  showToast("Material salvo com sucesso.", "success");
  await loadMaterials();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function hydrateData() {
  if (!supabaseClient) return;
  await Promise.all([loadProducts(), loadPosts(), loadMaterials(), loadMembers()]);
}

async function restoreSession() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) {
    state.currentUser = data.user;
    state.currentProfile = await fetchProfile(data.user.id);
  }
  renderProfile();
  await hydrateData();
}

function bootstrapRoute() {
  const hash = window.location.hash.replace("#", "") || "inicio";
  const exists = document.getElementById(hash);
  setRoute(exists ? hash : "inicio");
}

window.addEventListener("hashchange", bootstrapRoute);

document.getElementById("registerForm").addEventListener("submit", handleRegister);
document.getElementById("loginForm").addEventListener("submit", handleLogin);
document.getElementById("postForm").addEventListener("submit", handlePostSubmit);
document.getElementById("productForm").addEventListener("submit", handleProductSubmit);
document.getElementById("materialForm").addEventListener("submit", handleMaterialSubmit);
logoutBtn.addEventListener("click", handleLogout);

document.getElementById("refreshPostsBtn").addEventListener("click", loadPosts);
document.getElementById("refreshMaterialsBtn").addEventListener("click", loadMaterials);
document.getElementById("refreshMembersBtn").addEventListener("click", loadMembers);

bootstrapRoute();
restoreSession();
