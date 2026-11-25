/**
 * SwiftErrand Supabase Cloud Integration Client
 * Connects SwiftErrand frontend directly to live Supabase Postgres backend.
 * Provides Authentication, Live Profiles, Bookings, Escrow Telemetry, and Support Tickets.
 */

const SUPABASE_URL = "https://aitjqnfliraspychotrl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdGpxbmZsaXJhc3B5Y2hvdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDgyMzQsImV4cCI6MjEwMjUyNDIzNH0.OqDFSeT2Olj2sAD4_Gh3prtGzvob7EX9xdChXeRVq3M";

// Initialize Supabase Client instance
let _supabaseClient = null;

function getSupabase() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return _supabaseClient;
  }
  console.warn("Supabase JS SDK not loaded yet. Make sure @supabase/supabase-js is included.");
  return null;
}

const SwiftSupabase = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  client: null,

  init() {
    this.client = getSupabase();
    return this.client;
  },

  /* =========================================================
     1. AUTHENTICATION & PROFILES
  ========================================================= */

  /**
   * Register a new user with Supabase Auth and save profile details
   */
  async signUp({ email, password, fullName, phone, role = "client", trade = "", landmark = "", nin = "" }) {
    const sb = this.init();
    if (!sb) throw new Error("Supabase client is not available");

    const normalizedRole = (role === "agent" || role === "provider") ? "provider" : "client";

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: normalizedRole,
          trade: trade,
          landmark: landmark,
          nin: nin
        }
      }
    });

    if (error) throw error;

    const user = data.user;
    if (user) {
      // Upsert profile in swift_profiles table
      try {
        await sb.from("swift_profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          phone: phone,
          role: normalizedRole,
          trade: trade,
          landmark: landmark,
          nin: nin
        });
      } catch (profErr) {
        console.warn("Profile upsert notice:", profErr);
      }

      // Store in SwiftErrand local session for instant UI access
      const localUser = {
        id: user.id,
        name: fullName || email.split("@")[0],
        email: user.email,
        phone: phone,
        role: normalizedRole,
        accountType: normalizedRole === "provider" ? "Agent" : "User",
        landmark: landmark,
        trade: trade,
        avatar: normalizedRole === "provider" ? "assets/images/provider1.jpg" : "assets/images/customer1.jpg"
      };
      localStorage.setItem("swifterrand_user", JSON.stringify(localUser));
      localStorage.setItem("swifterrand_wallet_bal", "0");
      localStorage.setItem("swifterrand_bookings", "[]");
      localStorage.setItem("swifterrand_transactions", "[]");
      if (window.SwiftErrand && typeof window.SwiftErrand.setUser === "function") {
        window.SwiftErrand.setUser(localUser);
      }
    }

    return data;
  },

  /**
   * Sign in an existing user
   */
  async signIn({ email, password }) {
    const sb = this.init();
    if (!sb) throw new Error("Supabase client is not available");

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const user = data.user;
    let profile = null;

    if (user) {
      // Fetch profile from swift_profiles
      const { data: profData } = await sb
        .from("swift_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      profile = profData;

      const role = (profile && profile.role) || (user.user_metadata && user.user_metadata.role) || "client";
      const fullName = (profile && profile.full_name) || (user.user_metadata && user.user_metadata.full_name) || user.email.split("@")[0];
      const phone = (profile && profile.phone) || (user.user_metadata && user.user_metadata.phone) || "";
      const landmark = (profile && profile.landmark) || (user.user_metadata && user.user_metadata.landmark) || "";

      const localUser = {
        id: user.id,
        name: fullName,
        email: user.email,
        phone: phone,
        role: role,
        accountType: role === "provider" ? "Agent" : (role === "admin" ? "Admin" : "User"),
        landmark: landmark,
        avatar: role === "provider" ? "assets/images/provider1.jpg" : (role === "admin" ? "assets/images/admin.jpg" : "assets/images/customer1.jpg")
      };

      const realBal = (profile && profile.wallet_balance !== undefined) ? profile.wallet_balance.toString() : "0";
      localStorage.setItem("swifterrand_user", JSON.stringify(localUser));
      localStorage.setItem("swifterrand_wallet_bal", realBal);
      if (window.SwiftErrand && typeof window.SwiftErrand.setUser === "function") {
        window.SwiftErrand.setUser(localUser);
      }
    }

    return { session: data.session, user, profile };
  },

  /**
   * Get user profile details
   */
  async getUserProfile(userId) {
    const sb = this.init();
    if (!sb || !userId) return null;
    try {
      const { data, error } = await sb
        .from("swift_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) return null;
      return data;
    } catch (e) {
      return null;
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const sb = this.init();
    if (sb) {
      await sb.auth.signOut();
    }
    localStorage.removeItem("swifterrand_user");
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const sb = this.init();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  /* =========================================================
     2. PROVIDERS DIRECTORY (ARTISANS)
  ========================================================= */

  /**
   * Fetch verified providers from Supabase
   */
  async getProviders(category = "") {
    const sb = this.init();
    if (!sb) return [];

    let query = sb.from("swift_providers").select("*").eq("is_available", true);
    if (category && category !== "All Trades" && category !== "all") {
      query = query.ilike("trade", `%${category}%`);
    }

    const { data, error } = await query.order("rating", { ascending: false });
    if (error) {
      console.error("Error fetching providers:", error);
      return [];
    }
    return data || [];
  },

  /* =========================================================
     3. BOOKINGS & ESCROW
  ========================================================= */

  /**
   * Create a live booking in Supabase
   */
  async createBooking(bookingData) {
    const sb = this.init();
    const randomRef = "SE-" + Math.floor(1000 + Math.random() * 9000);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    let user = null;
    if (sb) {
      const res = await sb.auth.getUser();
      user = res.data ? res.data.user : null;
    }

    const callout = parseFloat(bookingData.calloutFee || 3000);
    const labor = parseFloat(bookingData.laborFee || 5000);
    const total = callout + labor;

    const record = {
      booking_ref: randomRef,
      client_id: user ? user.id : null,
      client_name: bookingData.customerName || (user && user.user_metadata && user.user_metadata.full_name) || "Customer",
      client_phone: bookingData.customerPhone || (user && user.user_metadata && user.user_metadata.phone) || "08000000000",
      provider_id: bookingData.providerId && bookingData.providerId.length > 20 ? bookingData.providerId : null,
      provider_name: bookingData.providerName || "Verified Swift Artisan",
      service_category: bookingData.service || "Home Repairs",
      mode: (bookingData.serviceMode && bookingData.serviceMode.toUpperCase().includes("MOVE")) ? "MOVE IT" : "DO IT",
      landmark: bookingData.landmark || "Shelter Afrique Estate",
      address: bookingData.address || "Lagos, Nigeria",
      appointment_date: bookingData.date ? new Date().toISOString().split("T")[0] : null,
      time_slot: bookingData.time || "12:00 PM",
      notes: bookingData.notes || "",
      callout_fee: callout,
      labor_fee: labor,
      total_escrow: total,
      status: "DISPATCHED",
      escrow_status: "HELD",
      completion_pin: pin
    };

    if (sb) {
      try {
        const { data, error } = await sb.from("swift_bookings").insert([record]).select().single();
        if (error) {
          console.warn("Supabase booking insert warning:", error);
        } else if (data) {
          record.id = data.id;
        }
      } catch (err) {
        console.error("Booking error:", err);
      }
    }

    // Sync with local SwiftErrand engine
    if (window.SwiftErrand && typeof window.SwiftErrand.createBooking === "function") {
      window.SwiftErrand.createBooking({
        id: randomRef,
        service: record.service_category,
        serviceMode: record.mode,
        customerName: record.client_name,
        customerPhone: record.client_phone,
        providerName: record.provider_name,
        landmark: record.landmark,
        address: record.address,
        calloutFee: record.callout_fee,
        laborFee: record.labor_fee,
        totalAmount: record.total_escrow,
        pin: pin,
        notes: record.notes
      });
    }

    return record;
  },

  /**
   * Fetch bookings for current user
   */
  async getBookings() {
    const sb = this.init();
    if (!sb) return [];

    const { data: { user } } = await sb.auth.getUser();
    let query = sb.from("swift_bookings").select("*").order("created_at", { ascending: false });
    
    if (user) {
      query = query.or(`client_id.eq.${user.id},client_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Error fetching Supabase bookings:", error);
      return [];
    }
    return data || [];
  },

  /* =========================================================
     4. SUPPORT TICKETS & DISPUTES
  ========================================================= */

  /**
   * Submit support or escrow dispute ticket to Supabase
   */
  async submitSupportTicket(ticketData) {
    const sb = this.init();
    const ref = "TICK-" + Math.floor(1000 + Math.random() * 9000);

    let user = null;
    if (sb) {
      const res = await sb.auth.getUser();
      user = res.data ? res.data.user : null;
    }

    const record = {
      ticket_ref: ref,
      user_id: user ? user.id : null,
      name: ticketData.name || "Customer",
      phone: ticketData.phone || "08000000000",
      booking_ref: ticketData.bookingRef || "General",
      category: ticketData.category || "escrow_dispute",
      message: ticketData.message || "",
      status: "OPEN"
    };

    if (sb) {
      const { data, error } = await sb.from("swift_support_tickets").insert([record]).select().single();
      if (error) {
        console.error("Support ticket error:", error);
      }
      return data || record;
    }
    return record;
  },

  /* =========================================================
     5. ADMIN CONSOLE & ESCROW OVERSIGHT METHODS
  ========================================================= */

  /**
   * Fetch all registered service providers for admin oversight
   */
  async getAllProviders() {
    const sb = this.init();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from("swift_providers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("getAllProviders error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch all bookings across the platform for admin oversight
   */
  async getAllBookings() {
    const sb = this.init();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from("swift_bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("getAllBookings error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch all registered profiles for admin user management
   */
  async getAllProfiles() {
    const sb = this.init();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from("swift_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("getAllProfiles error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch all support and dispute tickets
   */
  async getAllSupportTickets() {
    const sb = this.init();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from("swift_support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("getAllSupportTickets error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Admin: Update booking status and escrow release
   */
  async updateBookingEscrow(bookingRef, { status, escrow_status }) {
    const sb = this.init();
    if (!sb) return false;
    const payload = {};
    if (status) payload.status = status;
    if (escrow_status) payload.escrow_status = escrow_status;
    const { data, error } = await sb
      .from("swift_bookings")
      .update(payload)
      .eq("booking_ref", bookingRef)
      .select();
    if (error) {
      console.error("updateBookingEscrow error:", error);
      throw error;
    }
    return data;
  },

  /**
   * Admin: Update support ticket status
   */
  async updateTicketStatus(ticketRef, status) {
    const sb = this.init();
    if (!sb) return false;
    const { data, error } = await sb
      .from("swift_support_tickets")
      .update({ status })
      .eq("ticket_ref", ticketRef)
      .select();
    if (error) {
      console.error("updateTicketStatus error:", error);
      throw error;
    }
    return data;
  },

  /**
   * Admin: Create a new verified artisan
   */
  async createProvider(providerData) {
    const sb = this.init();
    if (!sb) return false;
    const { data, error } = await sb
      .from("swift_providers")
      .insert([providerData])
      .select()
      .single();
    if (error) {
      console.error("createProvider error:", error);
      throw error;
    }
    return data;
  },

  /**
   * Admin: Toggle provider availability
   */
  async toggleProviderAvailability(providerId, isAvailable) {
    const sb = this.init();
    if (!sb) return false;
    const { data, error } = await sb
      .from("swift_providers")
      .update({ is_available: isAvailable })
      .eq("id", providerId)
      .select();
    if (error) {
      console.error("toggleProviderAvailability error:", error);
      throw error;
    }
    return data;
  },

  /* =========================================================
     6. HEADER SESSION STATE SYNC ACROSS PLATFORM
  ========================================================= */
  async syncHeaderUser(sessionUser = null) {
    let user = sessionUser;
    const sb = this.init();

    if (!user && sb) {
      try {
        const { data } = await sb.auth.getUser();
        user = data ? data.user : null;
      } catch (e) {
        // quiet fallback
      }
    }

    if (!user && window.SwiftErrand && typeof window.SwiftErrand.getUser === "function") {
      user = window.SwiftErrand.getUser();
    }

    if (!user) return;

    const name = (user.user_metadata && user.user_metadata.full_name) || user.name || (user.email ? user.email.split("@")[0] : "My Account");
    const role = (user.user_metadata && user.user_metadata.role) || user.role || "client";
    const targetDashboard = (role === "provider" || role === "agent") ? "provider-dashboard.html" : (role === "admin" ? "admin-dashboard.html" : "dashboard.html");

    // 1. Update Sign In links in desktop header
    const signInElements = document.querySelectorAll('#headerSignInBtn, .header-user-btn, .login-btn, a[href="login.html"]:not(.modal-close):not(.footer a):not(.auth-panel-container a)');
    signInElements.forEach(el => {
      if (el.closest('.auth-view') || el.classList.contains('header-synced')) return;
      el.classList.add('header-synced');
      el.setAttribute('href', targetDashboard);
      el.style.borderRadius = '0';
      el.style.fontWeight = '700';
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.gap = '6px';
      el.innerHTML = `<i class="fa-solid fa-circle-user" style="color:#00A651;font-size:15px;"></i> <span>${name.split(" ")[0]}</span>`;
    });

    // 2. Add "Dashboard" link into .nav-menu if not present
    const navMenus = document.querySelectorAll('.nav-menu');
    navMenus.forEach(menu => {
      if (!menu.querySelector('.nav-dashboard-link')) {
        const li = document.createElement('li');
        li.className = 'nav-dashboard-link';
        li.innerHTML = `<a href="${targetDashboard}" class="nav-link" style="color:#00A651;font-weight:700;">Dashboard</a>`;
        menu.appendChild(li);
      }
    });

    // 3. Update mobile navigation drawers
    const mobileSignIn = document.querySelectorAll('#mobileNavDrawer a[href="login.html"]');
    mobileSignIn.forEach(btn => {
      if (btn.classList.contains('mobile-synced')) return;
      btn.classList.add('mobile-synced');
      btn.setAttribute('href', targetDashboard);
      btn.innerHTML = `Dashboard (${name.split(" ")[0]})`;
    });
  },

  initHeaderAuth() {
    const sb = this.init();
    this.syncHeaderUser();

    // Wire brand-icon click to AI Chat screen globally
    document.querySelectorAll('.brand-icon').forEach(icon => {
      icon.style.cursor = 'pointer';
      icon.setAttribute('title', 'Chat with SwiftErrand AI Assistant');
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.location.pathname.indexOf('ai-chat.html') === -1) {
          window.location.href = 'ai-chat.html';
        }
      });
    });

    if (sb) {
      sb.auth.onAuthStateChange((event, session) => {
        this.syncHeaderUser(session ? session.user : null);
      });
    }
  }
};

// Auto-initialize when document is ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    SwiftSupabase.init();
    SwiftSupabase.initHeaderAuth();
  });
}

window.SwiftSupabase = SwiftSupabase;
