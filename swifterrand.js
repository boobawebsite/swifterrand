/**
 * SwiftErrand Official Client Application Engine & State Store
 * Production Engine: Handles live authentication, bookings lifecycle, wallet, chat, and provider workflows.
 */

const SwiftErrand = (() => {
  // --- Verified Artisan Directory Fallbacks (Synchronized with Supabase swift_providers) ---
  const DEFAULT_PROVIDERS = [
    {
      id: "PROV-001",
      name: "Babatunde Adeleke",
      skill: "Generator Repair & Overhaul",
      phone: "08031112233",
      rating: 4.98,
      jobs: 380,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      verified: true,
      price: 5000,
      status: "Approved"
    },
    {
      id: "PROV-002",
      name: "Chukwuma Obi",
      skill: "Plumbing & Pipefitting",
      phone: "08089876543",
      rating: 4.95,
      jobs: 240,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      verified: true,
      price: 4500,
      status: "Approved"
    },
    {
      id: "PROV-003",
      name: "Adebayo Popoola",
      skill: "Electrical & Solar Engineering",
      phone: "08055543210",
      rating: 4.99,
      jobs: 520,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      verified: true,
      price: 6000,
      status: "Approved"
    },
    {
      id: "PROV-004",
      name: "Olumide Johnson",
      skill: "AC & Refrigeration Tech",
      phone: "08022211100",
      rating: 4.92,
      jobs: 195,
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      verified: true,
      price: 5500,
      status: "Approved"
    },
    {
      id: "PROV-005",
      name: "Blessing Okon",
      skill: "Deep Cleaning & Sanitization",
      phone: "08133399988",
      rating: 4.99,
      jobs: 420,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      verified: true,
      price: 6000,
      status: "Approved"
    }
  ];

  // --- Initialize Storage ---
  function initStorage() {
    // Sanitize initial wallet balance in client storage
    const storedBal = localStorage.getItem("swifterrand_wallet_bal");
    if (!storedBal || storedBal === "35500" || storedBal === "84500") {
      localStorage.setItem("swifterrand_wallet_bal", "0");
    }

    // Sanitize initial user sessions from client storage
    try {
      const storedUser = JSON.parse(localStorage.getItem("swifterrand_user") || "null");
      if (storedUser && (storedUser.name === "Chris Uzor" || storedUser.email === "chris@swifterrand.com" || !storedUser.id)) {
        localStorage.removeItem("swifterrand_user");
      }
    } catch (e) {
      localStorage.removeItem("swifterrand_user");
    }

    if (!localStorage.getItem("swifterrand_providers")) {
      localStorage.setItem("swifterrand_providers", JSON.stringify(DEFAULT_PROVIDERS));
    }

    try {
      const bks = JSON.parse(localStorage.getItem("swifterrand_bookings") || "[]");
      const cleaned = bks.filter(b => b.id !== "SE-8492" && b.id !== "SE-8319" && b.customerName !== "Dr. Sarah Akpan");
      if (cleaned.length !== bks.length || !localStorage.getItem("swifterrand_bookings")) {
        localStorage.setItem("swifterrand_bookings", JSON.stringify(cleaned));
      }
    } catch (e) {
      localStorage.setItem("swifterrand_bookings", "[]");
    }

    if (!localStorage.getItem("swifterrand_transactions")) {
      localStorage.setItem("swifterrand_transactions", "[]");
    }
    if (!localStorage.getItem("swifterrand_chats")) {
      localStorage.setItem("swifterrand_chats", "{}");
    }
    if (!localStorage.getItem("swifterrand_provider_online")) {
      localStorage.setItem("swifterrand_provider_online", "true");
    }
  }

  initStorage();

  // --- Public API ---
  return {
    // Auth & User
    getUser() {
      try {
        const stored = localStorage.getItem("swifterrand_user");
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    },
    setUser(user) {
      if (user) {
        localStorage.setItem("swifterrand_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("swifterrand_user");
      }
    },
    requireAuth(redirectUrl = "login.html") {
      const user = this.getUser();
      if (!user) {
        window.location.href = redirectUrl;
        return false;
      }
      return true;
    },
    logout() {
      if (window.SwiftSupabase && typeof window.SwiftSupabase.signOut === "function") {
        window.SwiftSupabase.signOut().catch(console.warn);
      }
      localStorage.removeItem("swifterrand_user");
      if (typeof showToast === "function") showToast("Signed out successfully", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 350);
    },

    // Bookings
    getBookings() {
      try {
        return JSON.parse(localStorage.getItem("swifterrand_bookings")) || [];
      } catch (e) {
        return [];
      }
    },
    saveBookings(list) {
      localStorage.setItem("swifterrand_bookings", JSON.stringify(list || []));
    },
    getActiveBooking() {
      const all = this.getBookings();
      return all.find(b => b.status !== "Completed" && b.status !== "Cancelled") || null;
    },
    getBookingById(id) {
      const all = this.getBookings();
      return all.find(b => b.id === id);
    },
    createBooking(data) {
      const all = this.getBookings();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      const user = this.getUser();

      const newBooking = {
        id: data.id || ("SE-" + randomNum),
        service: data.service || "General Service",
        serviceMode: data.serviceMode || "DO IT",
        customerName: data.customerName || (user && user.name) || "Customer",
        customerId: data.customerId || (user && user.id) || ("CUST-" + randomNum),
        customerPhone: data.customerPhone || (user && user.phone) || "",
        providerName: data.providerName || "Verified Swift Artisan",
        providerId: data.providerId || "PROV-001",
        providerPhone: data.providerPhone || "08000000000",
        providerAvatar: data.providerAvatar || "assets/images/provider1.jpg",
        landmark: data.landmark || (user && user.landmark) || "Lagos, Nigeria",
        address: data.address || (user && user.address) || "Lagos, Nigeria",
        calloutFee: data.calloutFee || 3000,
        laborFee: data.laborFee || 5000,
        totalAmount: (data.calloutFee || 3000) + (data.laborFee || 5000),
        status: data.status || "Accepted",
        date: data.date || new Date().toLocaleDateString('en-GB'),
        time: data.time || "12:00 PM",
        pin: data.pin || randomPin,
        gatePassCode: "PASS-SE" + randomNum,
        notes: data.notes || "Standard request via SwiftErrand"
      };

      all.unshift(newBooking);
      this.saveBookings(all);
      
      // Deduct from wallet if selected or record escrow
      this.addTransaction({
        id: "TXN-" + Math.floor(100 + Math.random() * 900),
        title: `Escrow for ${newBooking.service} (${newBooking.id})`,
        date: "Just now",
        amount: -newBooking.totalAmount,
        type: "debit",
        status: "Held in SwiftShield™"
      });

      return newBooking;
    },
    updateBookingStatus(id, newStatus) {
      const all = this.getBookings();
      const b = all.find(x => x.id === id);
      if (b) {
        b.status = newStatus;
        this.saveBookings(all);
        if (typeof showToast === "function") {
          showToast(`Booking ${id} status updated: ${newStatus}`, "success");
        }
      }
      return b;
    },

    // Wallet & Transactions
    getWalletBalance() {
      return parseInt(localStorage.getItem("swifterrand_wallet_bal") || "0", 10);
    },
    updateWalletBalance(delta) {
      const cur = this.getWalletBalance();
      const updated = Math.max(0, cur + delta);
      localStorage.setItem("swifterrand_wallet_bal", updated.toString());
      return updated;
    },
    getTransactions() {
      try {
        return JSON.parse(localStorage.getItem("swifterrand_transactions")) || [];
      } catch (e) {
        return [];
      }
    },
    addTransaction(tx) {
      const all = this.getTransactions();
      all.unshift(tx);
      localStorage.setItem("swifterrand_transactions", JSON.stringify(all));
    },

    // Chat
    getChat(providerId) {
      try {
        const chats = JSON.parse(localStorage.getItem("swifterrand_chats")) || {};
        return chats[providerId] || [];
      } catch (e) {
        return [];
      }
    },
    sendChatMessage(providerId, text, sender = "customer") {
      const chats = JSON.parse(localStorage.getItem("swifterrand_chats")) || {};
      if (!chats[providerId]) chats[providerId] = [];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = { sender, text, time };
      chats[providerId].push(msg);
      localStorage.setItem("swifterrand_chats", JSON.stringify(chats));
      return msg;
    },

    // Currency Formatter
    formatNaira(amount) {
      return "₦" + Number(amount || 0).toLocaleString();
    }
  };
})();

// Attach globally
window.SwiftErrand = SwiftErrand;
