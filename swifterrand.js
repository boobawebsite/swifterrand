/**
 * SwiftErrand Official Client Application Engine & State Store
 * Handles authentication, bookings lifecycle, wallet, chat, SOS, and admin/provider workflows.
 */

const SwiftErrand = (() => {
  // --- Seed Data Defaults ---
  const DEFAULT_USERS = {
    customer: {
      id: "CUST-101",
      name: "Dr. Sarah Akpan",
      email: "sarah.akpan@example.com",
      phone: "08031234567",
      role: "customer",
      avatar: "assets/images/customer1.jpg",
      address: "Plot 14, Unit C, Shelter Afrique Estate, Uyo",
      landmark: "Opposite De Choice, Shelter Gate 2",
      emergencyContact1: "08023456789 (Brother)",
      emergencyContact2: "08187654321 (Office)"
    },
    provider: {
      id: "PROV-201",
      name: "Emeka Okon",
      email: "emeka.okon@example.com",
      phone: "08089876543",
      role: "provider",
      skill: "Plumbing & Piping Repairs",
      avatar: "assets/images/provider1.jpg",
      rating: 4.9,
      completedJobs: 84,
      isOnline: true,
      trustLevel: 3,
      badges: ["NIN Verified", "Guarantor Verified", "Guild Endorsed"]
    },
    admin: {
      id: "ADMIN-001",
      name: "Administrator",
      email: "admin@swifterrand.ng",
      phone: "08007943837",
      role: "admin",
      avatar: "assets/images/admin.jpg"
    }
  };

  const DEFAULT_PROVIDERS = [
    {
      id: "PROV-201",
      name: "Emeka Okon",
      skill: "Plumbing Specialist",
      phone: "08089876543",
      rating: 4.9,
      jobs: 84,
      avatar: "assets/images/provider1.jpg",
      verified: true,
      price: 8500,
      status: "Approved"
    },
    {
      id: "PROV-202",
      name: "Jeremiah Bassey",
      skill: "Electrician & Solar Expert",
      phone: "08055543210",
      rating: 4.8,
      jobs: 67,
      avatar: "assets/images/provider2.jpg",
      verified: true,
      price: 10000,
      status: "Approved"
    },
    {
      id: "PROV-203",
      name: "Blessing Udoh",
      skill: "Home & Office Cleaning",
      phone: "08133399988",
      rating: 5.0,
      jobs: 112,
      avatar: "assets/images/provider3.jpg",
      verified: true,
      price: 7000,
      status: "Approved"
    },
    {
      id: "PROV-204",
      name: "Aniefiok Effiong",
      skill: "AC & Refrigeration Tech",
      phone: "08022211100",
      rating: 4.7,
      jobs: 42,
      avatar: "assets/images/provider4.jpg",
      verified: true,
      price: 12000,
      status: "Approved"
    },
    {
      id: "PROV-205",
      name: "Kufre Asuquo",
      skill: "Express Logistics Runner",
      phone: "09011122233",
      rating: 4.9,
      jobs: 153,
      avatar: "assets/images/provider5.jpg",
      verified: true,
      price: 3500,
      status: "Pending"
    }
  ];

  const DEFAULT_BOOKINGS = [
    {
      id: "SE-8492",
      service: "Plumbing & Leak Repair",
      serviceMode: "DO IT",
      customerName: "Dr. Sarah Akpan",
      customerId: "CUST-101",
      customerPhone: "08031234567",
      providerName: "Emeka Okon",
      providerId: "PROV-201",
      providerPhone: "08089876543",
      providerAvatar: "assets/images/provider1.jpg",
      landmark: "Shelter Afrique Estate (Gate 2)",
      address: "Plot 14, Unit C, Shelter Afrique, Uyo",
      calloutFee: 2500,
      laborFee: 8500,
      totalAmount: 11000,
      status: "In Progress", // Requested, Accepted, En Route, In Progress, Completed, Cancelled
      date: new Date().toLocaleDateString('en-GB'),
      time: "10:30 AM",
      pin: "4821",
      gatePassCode: "PASS-SE8492",
      notes: "Severe leak under kitchen granite sink basin. Tap cartridge needs replacement."
    },
    {
      id: "SE-8319",
      service: "AC Servicing & Gas Refill",
      serviceMode: "DO IT",
      customerName: "Dr. Sarah Akpan",
      customerId: "CUST-101",
      customerPhone: "08031234567",
      providerName: "Aniefiok Effiong",
      providerId: "PROV-204",
      providerPhone: "08022211100",
      providerAvatar: "assets/images/provider4.jpg",
      landmark: "Ewet Housing Estate",
      address: "12 Edet Akpan Avenue (4-Lane), Uyo",
      calloutFee: 2500,
      laborFee: 12000,
      totalAmount: 14500,
      status: "Completed",
      date: "22/10/2026",
      time: "02:15 PM",
      pin: "7193",
      gatePassCode: "PASS-SE8319",
      notes: "Routine maintenance and R22 gas refill for master bedroom split AC."
    }
  ];

  const DEFAULT_TRANSACTIONS = [
    {
      id: "TXN-901",
      title: "Diagnostic & Labor Escrow (SE-8492)",
      date: "Today, 10:30 AM",
      amount: -11000,
      type: "debit",
      status: "In Escrow (SwiftShield™)"
    },
    {
      id: "TXN-884",
      title: "Bank Transfer Top-up via Virtual NUBAN",
      date: "Yesterday, 04:12 PM",
      amount: 45000,
      type: "credit",
      status: "Successful"
    },
    {
      id: "TXN-762",
      title: "Payment for AC Servicing (SE-8319)",
      date: "22 Oct 2026",
      amount: -14500,
      type: "debit",
      status: "Completed"
    }
  ];

  const DEFAULT_CHATS = {
    "PROV-201": [
      { sender: "provider", text: "Good day Dr. Sarah! I have received your plumbing request for Shelter Afrique.", time: "10:32 AM" },
      { sender: "customer", text: "Hello Emeka. Please come as soon as possible, the water is dripping into the kitchen cabinet.", time: "10:33 AM" },
      { sender: "provider", text: "Understood! I am currently with my tool kit on Oron Road. Heading over in a keke now. ETA 15 minutes.", time: "10:35 AM" }
    ]
  };

  // --- Initialize Storage ---
  function initStorage() {
    if (!localStorage.getItem("swifterrand_user")) {
      localStorage.setItem("swifterrand_user", JSON.stringify(DEFAULT_USERS.customer));
    }
    if (!localStorage.getItem("swifterrand_bookings")) {
      localStorage.setItem("swifterrand_bookings", JSON.stringify(DEFAULT_BOOKINGS));
    }
    if (!localStorage.getItem("swifterrand_providers")) {
      localStorage.setItem("swifterrand_providers", JSON.stringify(DEFAULT_PROVIDERS));
    }
    if (!localStorage.getItem("swifterrand_wallet_bal")) {
      localStorage.setItem("swifterrand_wallet_bal", "35500");
    }
    if (!localStorage.getItem("swifterrand_transactions")) {
      localStorage.setItem("swifterrand_transactions", JSON.stringify(DEFAULT_TRANSACTIONS));
    }
    if (!localStorage.getItem("swifterrand_chats")) {
      localStorage.setItem("swifterrand_chats", JSON.stringify(DEFAULT_CHATS));
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
        return JSON.parse(localStorage.getItem("swifterrand_user")) || DEFAULT_USERS.customer;
      } catch (e) {
        return DEFAULT_USERS.customer;
      }
    },
    setUser(user) {
      localStorage.setItem("swifterrand_user", JSON.stringify(user));
    },
    loginAs(role) {
      const u = DEFAULT_USERS[role] || DEFAULT_USERS.customer;
      this.setUser(u);
      if (typeof showToast === "function") {
        showToast(`Logged in as ${u.name} (${u.role.toUpperCase()})`, "success");
      }
      setTimeout(() => {
        if (role === "admin") window.location.href = "admin-dashboard.html";
        else if (role === "provider") window.location.href = "provider-dashboard.html";
        else window.location.href = "dashboard.html";
      }, 500);
    },
    logout() {
      localStorage.removeItem("swifterrand_user");
      if (typeof showToast === "function") showToast("Signed out successfully", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 400);
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
      localStorage.setItem("swifterrand_bookings", JSON.stringify(list));
    },
    getActiveBooking() {
      const all = this.getBookings();
      return all.find(b => b.status !== "Completed" && b.status !== "Cancelled") || all[0];
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
        id: "SE-" + randomNum,
        service: data.service || "General Service",
        serviceMode: data.serviceMode || "DO IT",
        customerName: user.name || "Dr. Sarah Akpan",
        customerId: user.id || "CUST-101",
        customerPhone: user.phone || "08031234567",
        providerName: data.providerName || "Emeka Okon",
        providerId: data.providerId || "PROV-201",
        providerPhone: data.providerPhone || "08089876543",
        providerAvatar: data.providerAvatar || "assets/images/provider1.jpg",
        landmark: data.landmark || "Shelter Afrique Estate",
        address: data.address || user.address || "Uyo, Akwa Ibom State",
        calloutFee: data.calloutFee || 2500,
        laborFee: data.laborFee || 8000,
        totalAmount: (data.calloutFee || 2500) + (data.laborFee || 8000),
        status: "Accepted",
        date: data.date || new Date().toLocaleDateString('en-GB'),
        time: data.time || "12:00 PM",
        pin: randomPin,
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
          showToast(`Booking ${id} status updated to: ${newStatus}`, "success");
        }
      }
      return b;
    },

    // Wallet & Transactions
    getWalletBalance() {
      return parseInt(localStorage.getItem("swifterrand_wallet_bal") || "35500", 10);
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
    getChat(providerId = "PROV-201") {
      try {
        const chats = JSON.parse(localStorage.getItem("swifterrand_chats")) || {};
        return chats[providerId] || [];
      } catch (e) {
        return [];
      }
    },
    sendChatMessage(providerId, text, sender = "customer", callback = null) {
      const chats = JSON.parse(localStorage.getItem("swifterrand_chats")) || {};
      if (!chats[providerId]) chats[providerId] = [];
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      chats[providerId].push({ sender, text, time: timeStr });
      localStorage.setItem("swifterrand_chats", JSON.stringify(chats));

      if (sender === "customer") {
        // Auto-reply simulation from provider
        setTimeout(() => {
          const replies = [
            "Got your message! I'm on it right now.",
            "Yes, I have the required replacement parts. See you shortly!",
            "I have arrived at the gate. Asking the guard for clearance.",
            "Thank you! Please check the work and share your 4-digit PIN when satisfied."
          ];
          const autoReply = replies[Math.floor(Math.random() * replies.length)];
          const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          chats[providerId].push({ sender: "provider", text: autoReply, time: replyTime });
          localStorage.setItem("swifterrand_chats", JSON.stringify(chats));
          if (callback) callback({ sender: "provider", text: autoReply, time: replyTime });
        }, 1500);
      }
    },

    // Providers
    getProviders() {
      try {
        return JSON.parse(localStorage.getItem("swifterrand_providers")) || DEFAULT_PROVIDERS;
      } catch (e) {
        return DEFAULT_PROVIDERS;
      }
    },
    updateProviderStatus(id, newStatus) {
      const provs = this.getProviders();
      const p = provs.find(x => x.id === id);
      if (p) {
        p.status = newStatus;
        localStorage.setItem("swifterrand_providers", JSON.stringify(provs));
        if (typeof showToast === "function") {
          showToast(`Provider ${p.name} marked as ${newStatus}`, newStatus === "Approved" ? "success" : "error");
        }
      }
      return provs;
    },

    // Formatters
    formatNaira(amount) {
      return "₦" + Number(amount).toLocaleString('en-NG');
    }
  };
})();

// Auto-bind demo buttons and elements on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Sync user info on headers if element exists
  const userGreeting = document.getElementById("userGreeting");
  if (userGreeting) {
    const u = SwiftErrand.getUser();
    userGreeting.innerText = u.name.split(" ")[0];
  }
});
