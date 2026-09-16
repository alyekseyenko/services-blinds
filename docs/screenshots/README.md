# Screenshots

Production captures for the GitHub README (generated via `node scripts/capture-readme-screenshots.mjs`).

| File | Description |
|------|-------------|
| `login-desktop.png` | CRM sign-in — role-based routing (admin, CEO, technician, warehouse) |
| `login-mobile.png` | Same login on mobile viewport (PWA entry point) |
| `public-rating-invalid-link.png` | Customer rating portal — invalid/expired signed link |
| `public-rating-form.png` | Customer rating portal — star rating UI |
| `public-cancellation-invalid-link.png` | Customer cancellation portal — invalid link guard |

Optional authenticated captures (set in `.env.local`):

```env
SCREENSHOT_ADMIN_EMAIL=your-admin@company.com
SCREENSHOT_ADMIN_PASSWORD=your-password
```

Re-run the script after setting credentials to add `admin-map.png`, `admin-history.png`, `ceo-dashboard.png`, `admin-observability.png`, and `technician-dashboard.png`.
