import { Routes } from '@angular/router';
import { authGuard, superAdminGuard } from './core/guards';

/**
 * Route map for the 28 wireframe screens.
 * Public portal under /, administrative dashboard under /admin.
 */
export const routes: Routes = [
  /* ---------------- public information portal ---------------- */
  {
    path: '',
    loadComponent: () => import('./public/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./public/home.component').then(m => m.HomeComponent),
        title: 'Bahay Pag-ibig' },
      { path: 'about', loadComponent: () => import('./public/about.component').then(m => m.AboutComponent),
        title: 'About Us — Bahay Pag-ibig' },
      { path: 'events', loadComponent: () => import('./public/events.component').then(m => m.EventsComponent),
        title: 'Events — Bahay Pag-ibig' },
      { path: 'wishlist', loadComponent: () => import('./public/wishlist.component').then(m => m.WishlistComponent),
        title: 'Wishlist & Donation Guidelines — Bahay Pag-ibig' },
      { path: 'donate/report',
        loadComponent: () => import('./public/donate-report.component').then(m => m.DonateReportComponent),
        title: 'Report Your Donation — Bahay Pag-ibig' },
      { path: 'volunteer', loadComponent: () => import('./public/volunteer.component').then(m => m.VolunteerComponent),
        title: 'Volunteer Registration — Bahay Pag-ibig' },
      { path: 'contact', loadComponent: () => import('./public/contact.component').then(m => m.ContactComponent),
        title: 'Contact Us — Bahay Pag-ibig' },
      { path: 'faq', loadComponent: () => import('./public/chatbot.component').then(m => m.ChatbotComponent),
        title: 'Frequently Asked Questions — Bahay Pag-ibig' },
    ],
  },

  /* ---------------- administrative dashboard ---------------- */
  { path: 'admin/login',
    loadComponent: () => import('./admin/login.component').then(m => m.LoginComponent),
    title: 'Staff Sign In — Bahay Pag-ibig' },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard',
        loadComponent: () => import('./admin/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard' },

      { path: 'applications',
        loadComponent: () => import('./admin/applications.component').then(m => m.ApplicationsComponent),
        title: 'Volunteer Applications' },
      { path: 'profiles',
        loadComponent: () => import('./admin/profiles.component').then(m => m.ProfilesComponent),
        title: 'Profiles & Hours' },
      { path: 'certificates',
        loadComponent: () => import('./admin/certificates.component').then(m => m.CertificatesComponent),
        title: 'Certificates' },

      { path: 'donations',
        loadComponent: () => import('./admin/donations.component').then(m => m.DonationsComponent),
        title: 'Donation Records' },
      { path: 'donations/new',
        loadComponent: () => import('./admin/log-donation.component').then(m => m.LogDonationComponent),
        title: 'Log New Donation' },
      { path: 'wishlist',
        loadComponent: () => import('./admin/wishlist-admin.component').then(m => m.WishlistAdminComponent),
        title: 'Wishlist & Inventory' },
      { path: 'inventory',
        loadComponent: () => import('./admin/inventory.component').then(m => m.InventoryComponent),
        title: 'Inventory Log' },

      { path: 'events',
        loadComponent: () => import('./admin/events-admin.component').then(m => m.EventsAdminComponent),
        title: 'Events & Announcements' },
      { path: 'organization',
        loadComponent: () => import('./admin/organization.component').then(m => m.OrganizationComponent),
        title: 'Organization Info' },
      { path: 'faqs',
        loadComponent: () => import('./admin/faqs-admin.component').then(m => m.FaqsAdminComponent),
        title: 'FAQ Content' },
      { path: 'inquiries',
        loadComponent: () => import('./admin/inquiries.component').then(m => m.InquiriesComponent),
        title: 'Contact Inquiries' },

      { path: 'graphical-reports',
        loadComponent: () => import('./admin/graphical-reports.component').then(m => m.GraphicalReportsComponent),
        title: 'Graphical Reports' },
      { path: 'monthly-reports',
        loadComponent: () => import('./admin/monthly-reports.component').then(m => m.MonthlyReportsComponent),
        title: 'Monthly Reports' },
      { path: 'activity-log',
        loadComponent: () => import('./admin/activity-log.component').then(m => m.ActivityLogComponent),
        title: 'Activity Log' },
      { path: 'account',
        loadComponent: () => import('./admin/my-account.component').then(m => m.MyAccountComponent),
        title: 'My Account' },
      { path: 'accounts',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./admin/user-accounts.component').then(m => m.UserAccountsComponent),
        title: 'User Accounts' },
    ],
  },

  { path: '**', redirectTo: '' },
];
