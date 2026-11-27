# Security Specification for AquaLink

## Data Invariants
1. A booking must be associated with a valid user ID.
2. Only admins can confirm or dispatch tankers.
3. Drivers can only update the status of bookings assigned to them (or specifically 'Delivered').
4. Residents can only view their own bookings and complaints.
5. Critical fields like `volume`, `userId`, and `priority` are immutable after creation by the resident.
6. Admin status is strictly managed and cannot be self-assigned.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a booking with someone else's `userId`.
2. **Privilege Escalation**: Attempt to update a user profile to set `role: 'admin'`.
3. **Ghost Field Injection**: Add `isVerified: true` to a booking update.
4. **Price Tampering**: (Handled by client but rules should ensure immutability of core booking details if they affect price).
5. **Unauthorized Status Update**: A resident trying to mark their own booking as 'Confirmed'.
6. **Orphaned Writing**: Attempting to create a complaint without a `userId`.
7. **Resource Poisoning**: Using a 10KB string as a `bookingId`.
8. **PII Leakage**: A visitor trying to 'list' the `users` collection.
9. **Cross-User Access**: User A trying to 'get' User B's booking.
10. **State Shortcut**: Moving a booking from 'Pending' directly to 'Delivered'.
11. **Timestamp Spoofing**: Sending a `createdAt` value from the past or future.
12. **Master Gate Bypass**: Deleting a booking (should only be allowed for admins/specific conditions).

## The Test Runner (Plan)
A `firestore.rules.test.ts` will be implemented to verify these constraints.
