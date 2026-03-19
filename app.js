const SUPABASE_URL = "https://bqsxjgybrkskaxqurpir.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_htJYZHMv236djJoNWD2Ivw_DA_Eh8hu";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  user: null,
  profile: null,
};

const els = {
  mainNav: document.getElementById("mainNav"),
  menuBtn: document.getElementById("menuBtn"),
  openAuthBtn: document.getElementById("openAuthBtn"),
  authModal: document.getElementById("authModal"),
  closeAuthBtn: document.getElementById("closeAuthBtn"),
  closeAuthBackdrop: document.getElementById("closeAuthBackdrop"),
  logoutBtn: document.getElementById("logoutBtn"),
  messageBox: document.getElementById("messageBox"),
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  postForm: document.getElementById("postForm"),
  productForm: document.getElementById("productForm"),
  materialForm: document.getElementById("materialForm"),
  postsList: document.getElementById("postsList"),
  productsList: document.getElementById("productsList"),
  materialsList: document.getElementById("materialsList"),
  membersList: document.getElementById("membersList"),
  profileNome: document.getElementById("profileNome"),
  profileEmail: document.getElementById("profileEmail"),
  profileNivel: document.getElementById("profileNivel"),
  profileStatus: document.getElementById("profileStatus"),
  vipLocked: document.getElementById("vipLocked"),
  vipContent: document.getElementById("vipContent"),
  adminPanel: document.getElementById("adminPanel"),
  adminLocked: document.getElementById("adminLocked"),
  refreshPostsBtn: document.getElementById("refreshPostsBtn"),
  refreshProductsBtn: document.getElementById("refreshProductsBtn"),
  refreshMaterialsBtn: document.getElementById("refreshMaterialsBtn"),
  refreshMembersBtn: document.getElementById("refreshMembersBtn"),
};

function showMessage(text, type = "success") {
  els.messageBox.textContent = text;
  els.messageBox.className = `message ${type}`;
}

function hideMessage() {
  els.messageBox.className = "message hidden";
  els.messageBox.textContent = "";
}

function openAuthModal() { els.authModal.classList.remove("hidden"); }
function closeAuthModal() { els.authModal.classList.add("hidden"); hideMessage(); }

function setTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  els.registerForm.classList.toggle("hidden", tabName !== "register");
  els.loginForm.classList.toggle("hidden", tabName !== "login");
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("pt-BR");
}

function sanitizePhone(v) { return (v || "").replace(/\D/g, ""); }
function sanitizeCpf(v) { return (v || "").replace(/\D/g, ""); }

function updateUI() {
  const profile = state.profile;
  const isLogged = !!state.user;
  const isVip = profile && (profile.role === "vip" || profile.role === "admin");
  const isAdmin = profile && profile.role === "admin";

  els.profileNome.textContent = profile?.nome || "Visitante";
  els.profileEmail.textContent = profile?.email || "-";
  els.profileNivel.textContent = profile?.role || "iniciante";
  els.profileStatus.textContent = isLogged ? "logado" : "não logado";
  els.openAuthBtn.textContent = isLogged ? "Minha conta" : "Entrar";

  els.vipLocked.classList.toggle("hidden", isVip);
  els.vipContent.classList.toggle("hidden", !isVip);
  els.adminPanel.classList.toggle("hidden", !isAdmin);
  els.adminLocked.classList.toggle("hidden", isAdmin);

  document.getElementById("productFormCard").classList.toggle("hidden", !isLogged);
  document.getElementById("materialFormCard").classList.toggle("hidden", !isAdmin);
}

async function loadProfile() {
  if (!supabaseClient || !state.user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,nome,email,telefone,cpf,role,status")
    .eq("id", state.user.id)
    .single();

  if (!error) state.profile = data;
  updateUI();
}

async function checkUser() {
  if (!supabaseClient) {
    updateUI();
    renderConfigWarnings();
    return;
  }

  const { data } = await supabaseClient.auth.getUser();
  state.user = data?.user || null;
  if (state.user) await loadProfile();
  updateUI();
  await Promise.all([loadPosts(), loadProducts(), loadMaterials()]);
  if (state.profile?.role === "admin") await loadMembers();
}

function renderConfigWarnings() {
  const warning = `Configure a SUPABASE_URL e a SUPABASE_ANON_KEY no arquivo app.js para ativar cadastro, login e banco de dados.`;
  els.postsList.innerHTML = `<div class="post-card"><h4>Configuração necessária</h4><p>${warning}</p></div>`;
  els.productsList.innerHTML = `<div class="product-card"><h4>Configuração necessária</h4><p>${warning}</p></div>`;
  els.materialsList.innerHTML = `<div class="material-card"><h4>Configuração necessária</h4><p>${warning}</p></div>`;
}

async function loadPosts() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("community_posts")
    .select("id,content,created_at,profiles(nome)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) {
    els.postsList.innerHTML = `Nenhuma publicação ainda.`;
    return;
  }

  els.postsList.innerHTML = data.map(post => `
    <article class="post-card">
      <h4>${post.profiles?.nome || "Membro"}</h4>
      <div class="post-meta">${formatDate(post.created_at)}</div>
      <p>${post.content}</p>
    </article>
  `).join("");
}

async function loadProducts() {
  if (!supabaseClient) return;
  const isVip = state.profile && (state.profile.role === "vip" || state.profile.role === "admin");
  let query = supabaseClient
    .from("products")
    .select("id,title,description,checkout_url,member_name,whatsapp,visibility,created_at")
    .order("created_at", { ascending: false });

  if (!isVip) query = query.eq("visibility", "publico");

  const { data, error } = await query;
  if (error || !data?.length) {
    els.productsList.innerHTML = `Nenhum produto cadastrado.`;
    return;
  }

  els.productsList.innerHTML = data.map(item => `
    <article class="product-card">
      <h4>${item.title}</h4>
      <div class="card-meta">${item.visibility.toUpperCase()} • ${formatDate(item.created_at)}</div>
      <p>${item.description}</p>
      <p><strong>Membro responsável:</strong> ${item.member_name}</p>
      <p><strong>Suporte:</strong> <a class="support-link" target="_blank" href="https://wa.me/${sanitizePhone(item.whatsapp)}">${item.whatsapp}</a></p>
      <div class="card-actions">
        <a class="btn btn-primary btn-small" target="_blank" href="${item.checkout_url}">Comprar agora</a>
      </div>
    </article>
  `).join("");
}

async function loadMaterials() {
  if (!supabaseClient) return;
  const role = state.profile?.role || "iniciante";
  let allowedLevels = ["iniciante"];
  if (role === "vip" || role === "admin") allowedLevels = ["iniciante", "vip"];

  const { data, error } = await supabaseClient
    .from("materials")
    .select("id,title,description,url,level,created_at")
    .in("level", allowedLevels)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    els.materialsList.innerHTML = `Nenhum material cadastrado.`;
    return;
  }

  els.materialsList.innerHTML = data.map(item => `
    <article class="material-card">
      <h4>${item.title}</h4>
      <div class="card-meta">${item.level.toUpperCase()} • ${formatDate(item.created_at)}</div>
      <p>${item.description}</p>
      <div class="card-actions">
        <a class="btn btn-primary btn-small" target="_blank" href="${item.url}">Abrir material</a>
      </div>
    </article>
  `).join("");
}

async function loadMembers() {
  if (!supabaseClient || state.profile?.role !== "admin") return;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,nome,email,role,status,created_at")
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    els.membersList.innerHTML = `Nenhum membro carregado.`;
    return;
  }

  els.membersList.innerHTML = data.map(member => `
    <article class="member-card">
      <h4>${member.nome || "Sem nome"}</h4>
      <div class="card-meta">${member.email || "-"} • ${formatDate(member.created_at)}</div>
      <p><strong>Nível:</strong> ${member.role}</p>
      <p><strong>Status:</strong> ${member.status || "ativo"}</p>
      <div class="member-controls">
        <button class="btn btn-small btn-primary" onclick="updateMemberRole('${member.id}','iniciante')">Iniciante</button>
        <button class="btn btn-small btn-primary" onclick="updateMemberRole('${member.id}','vip')">VIP</button>
        <button class="btn btn-small btn-secondary" onclick="updateMemberRole('${member.id}','admin')">Admin</button>
      </div>
    </article>
  `).join("");
}

window.updateMemberRole = async function(userId, role) {
  if (!supabaseClient || state.profile?.role !== "admin") return;
  const { error } = await supabaseClient
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return alert(error.message);
  await loadMembers();
  if (state.user?.id === userId) {
    await loadProfile();
    await loadProducts();
    await loadMaterials();
  }
};

els.menuBtn.addEventListener("click", () => els.mainNav.classList.toggle("open"));
els.openAuthBtn.addEventListener("click", () => {
  if (state.user) {
    document.getElementById("membros").scrollIntoView({ behavior: "smooth" });
    return;
  }
  openAuthModal();
});
els.closeAuthBtn.addEventListener("click", closeAuthModal);
els.closeAuthBackdrop.addEventListener("click", closeAuthModal);
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

els.registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient) return showMessage("Configure o Supabase no app.js.", "error");
  hideMessage();

  const nome = document.getElementById("registerNome").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const telefone = sanitizePhone(document.getElementById("registerTelefone").value.trim());
  const cpf = sanitizeCpf(document.getElementById("registerCpf").value.trim());
  const senha = document.getElementById("registerSenha").value;

  const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
  if (error) return showMessage(error.message, "error");

  const user = data.user;
  if (!user) return showMessage("Usuário não retornado no cadastro.", "error");

  const { error: profileError } = await supabaseClient.from("profiles").insert({
    id: user.id,
    nome,
    email,
    telefone,
    cpf,
    role: "iniciante",
    status: "ativo"
  });

  if (profileError) return showMessage(profileError.message, "error");
  showMessage("Cadastro realizado com sucesso. Agora faça seu login.", "success");
  els.registerForm.reset();
  setTab("login");
});

els.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient) return showMessage("Configure o Supabase no app.js.", "error");
  hideMessage();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginSenha").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return showMessage(error.message, "error");

  state.user = data.user;
  await loadProfile();
  await Promise.all([loadPosts(), loadProducts(), loadMaterials()]);
  if (state.profile?.role === "admin") await loadMembers();
  closeAuthModal();
});

els.logoutBtn.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  state.user = null;
  state.profile = null;
  updateUI();
  await Promise.all([loadPosts(), loadProducts(), loadMaterials()]);
});

els.postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient || !state.user) return alert("Faça login para publicar.");
  const content = document.getElementById("postContent").value.trim();
  if (!content) return;

  const { error } = await supabaseClient.from("community_posts").insert({ user_id: state.user.id, content });
  if (error) return alert(error.message);
  e.target.reset();
  await loadPosts();
});

els.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient || !state.user) return alert("Faça login para cadastrar produtos.");

  const payload = {
    title: document.getElementById("productTitle").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    checkout_url: document.getElementById("productCheckout").value.trim(),
    member_name: document.getElementById("productMemberName").value.trim(),
    whatsapp: document.getElementById("productWhatsapp").value.trim(),
    visibility: document.getElementById("productVisibility").value,
    created_by: state.user.id,
  };

  const { error } = await supabaseClient.from("products").insert(payload);
  if (error) return alert(error.message);
  e.target.reset();
  await loadProducts();
});

els.materialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient || state.profile?.role !== "admin") return alert("Somente admin pode cadastrar materiais.");

  const payload = {
    title: document.getElementById("materialTitle").value.trim(),
    description: document.getElementById("materialDescription").value.trim(),
    url: document.getElementById("materialUrl").value.trim(),
    level: document.getElementById("materialLevel").value,
    created_by: state.user.id,
  };

  const { error } = await supabaseClient.from("materials").insert(payload);
  if (error) return alert(error.message);
  e.target.reset();
  await loadMaterials();
});

els.refreshPostsBtn.addEventListener("click", loadPosts);
els.refreshProductsBtn.addEventListener("click", loadProducts);
els.refreshMaterialsBtn.addEventListener("click", loadMaterials);
els.refreshMembersBtn.addEventListener("click", loadMembers);

checkUser();
