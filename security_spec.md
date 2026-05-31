# Security Specification: LupaCheque Database Hardening

## 1. Data Invariants
- Admin users are stored in `/admins/{adminId}`.
- Visitors are stored in `/visitors/{visitorId}`.
- Only the SuperAdmin (`emprende@biia-dots.com`) or provisioned administrators are allowed to read or write any configuration in the database.
- Any unauthorized email trying to read/write will be blocked synchronously.

## 2. The "Dirty Dozen" Malicious Payloads
Here are the 12 hostile payloads trying to compromise the system that our Firestore Security Rules MUST prevent.

1. **Anonymous Admin Write**: An unauthenticated user tries to add an admin.
2. **Visitor Privilege Escalation**: A normal user tries to promote their account to Admin status.
3. **Impersonate Creator**: Writing a new admin with custom `ownerId` set to a victim.
4. **Bypass 2FA Constraint**: Writing an admin with non-boolean values for the `twoFactor` field.
5. **Junk ID Insertion**: Writing a visitor with a 2MB large junk string as the document ID.
6. **Orphaned Visitor Entry**: Attempting to read details of an admin without passing through proper auth checking.
7. **Timestamp Spoofing**: Supplying a client-side timestamp in `createdAt` to simulate being created 5 years ago.
8. **Out of Range Date Integrity**: Setting `validTo` date earlier than `validFrom`.
9. **SQL/Injection Characters** in document fields.
10. **Malicious Query scraping**: Trying to read all admin emails anonymously without a specific query constraint.
11. **Altering Immutable Fields**: Attempting to change the `createdAt` timestamp of an existing administrator entry.
12. **Double Delete Attacker**: Attempting to delete settings documents that do not belong to the user's domain.

## 3. Test Cases (Security Validation Suite)
All payloads above must return `PERMISSION_DENIED` dynamically on evaluation of compiled rules.
