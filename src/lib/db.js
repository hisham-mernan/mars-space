import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');

// Read current database state
export function getDb() {
  try {
    const fileData = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error("Database read error, returning empty state:", error);
    return {
      branches: [],
      resources: [],
      membership_plans: [],
      users: [],
      bookings: [],
      invoices: [],
      contracts: [],
      events: [],
      faqs: []
    };
  }
}

// Save current database state
export function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Database save error:", error);
    return false;
  }
}

// Convert "HH:MM" time string to minutes since midnight for comparison
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Conflict Detection logic
export function checkAvailability(resourceId, date, startTime, endTime, excludeBookingId = null) {
  const db = getDb();
  
  // Find resource to verify if it exists and status is "Available"
  const resource = db.resources.find(r => r.id === resourceId);
  if (!resource) return { available: false, reason: "Resource not found" };
  if (resource.status !== "Available") return { available: false, reason: `Resource status is ${resource.status}` };

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (startMin >= endMin) {
    return { available: false, reason: "Start time must be before end time" };
  }

  // Check overlap with confirmed/checked-in bookings
  const overlaps = db.bookings.filter(b => {
    if (b.resourceId !== resourceId) return false;
    if (b.date !== date) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status !== "Confirmed" && b.status !== "Checked-In") return false;

    const bStartMin = timeToMinutes(b.startTime);
    const bEndMin = timeToMinutes(b.endTime);

    // Overlap condition
    return (startMin < bEndMin) && (endMin > bStartMin);
  });

  if (overlaps.length > 0) {
    return {
      available: false,
      reason: "Time slot is already booked by another customer",
      conflict: overlaps[0]
    };
  }

  return { available: true };
}

// Dynamic Pricing calculation
export function calculatePrice(resourceId, date, startTime, endTime, userId = null) {
  const db = getDb();
  const resource = db.resources.find(r => r.id === resourceId);
  if (!resource) return { subtotal: 0, vat: 0, total: 0 };

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const hours = (endMin - startMin) / 60;

  // Base rate
  let basePrice = resource.rate * hours;
  if (resource.category === 'community_hall') {
    // Daily rate for community hall
    basePrice = resource.rate;
  }

  let timeAdjustment = 0;
  let peakHourAdjustment = 0;
  let weekendAdjustment = 0;
  let membershipDiscount = 0;

  // Peak Hour check (12:00 to 15:00 is peak: 12 PM - 3 PM)
  const peakStart = timeToMinutes("12:00");
  const peakEnd = timeToMinutes("15:00");
  if ((startMin < peakEnd) && (endMin > peakStart)) {
    // 10% premium on base rate during peak hours
    peakHourAdjustment = basePrice * 0.10;
  }

  // Weekend check (Friday & Saturday are typical weekends in KSA, let's support Saturday/Sunday check)
  const dayOfWeek = new Date(date).getDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // 15% weekend adjustment
    weekendAdjustment = basePrice * 0.15;
  }

  // Member discount
  if (userId) {
    const user = db.users.find(u => u.id === userId);
    if (user && user.membership) {
      // 20% membership discount for active members
      membershipDiscount = (basePrice + peakHourAdjustment + weekendAdjustment) * 0.20;
    }
  }

  const subtotal = Math.round((basePrice + peakHourAdjustment + weekendAdjustment - membershipDiscount) * 100) / 100;
  const vat = Math.round((subtotal * 0.15) * 100) / 100; // 15% VAT in KSA
  const total = Math.round((subtotal + vat) * 100) / 100;

  return {
    hours,
    basePrice,
    peakHourAdjustment,
    weekendAdjustment,
    membershipDiscount,
    subtotal,
    vat,
    total
  };
}
