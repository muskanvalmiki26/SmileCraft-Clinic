# SmileCraft Dental Clinic — Full Working Demo

This package keeps the complete SmileCraft clinic website and adds a real Node.js backend.

## Run
1. Install Node.js.
2. Open terminal in this folder.
3. Run `node server.js`.
4. Open `http://localhost:3000`.

## Included
- Full original clinic website: services, about/clinic information, doctors, reviews, FAQ, contact and booking sections.
- Gender-specific doctor avatars in the doctor cards.
- Real doctor + treatment data loaded from the backend.
- Doctor schedules, treatment duration and availability slots.
- Server-side double-booking prevention.
- Persistent appointments/patients in `data/database.json`.
- Unique appointment ID generated for every booking.
- Patient Manage Appointment portal after booking and after refresh.
- Reschedule and cancel using appointment ID.
- Admin portal at `/admin`.
- Admin credentials are NOT prefilled.
- Admin ID: `shrishti@smilecraft`
- Admin password: `shrishti12`
- Admin endpoints require the backend admin session token.
- Admin dashboard: appointment statuses, patient records and doctor leave management.

## Demo note
OTP, SMS/WhatsApp automation and reminder scheduling are intentionally not included yet. Those should be customized for the real clinic/client later.
