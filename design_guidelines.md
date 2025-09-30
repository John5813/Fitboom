# FitBoom Fitness Marketplace - Design Guidelines

## Design Approach: Reference-Based (ClassPass + Modern Fitness Apps)

**Primary References**: ClassPass, Mindbody, Nike Training Club
**Design Philosophy**: Aspirational yet accessible fitness experience with clear transaction flows and energetic visual language

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary Brand: 145 75% 45% (Vibrant fitness teal/turquoise - energetic, active)
- Background: 0 0% 98% (Clean white base)
- Surface: 0 0% 100% (Cards, elevated elements)
- Text Primary: 220 15% 15% (Deep charcoal)
- Text Secondary: 220 10% 45% (Medium gray)
- Success: 142 70% 45% (Confirmed bookings)
- Accent: 25 85% 55% (Energy orange for CTAs)

**Dark Mode:**
- Primary Brand: 145 65% 55% (Lighter teal for visibility)
- Background: 220 20% 12% (Deep navy-black)
- Surface: 220 15% 18% (Elevated cards)
- Text Primary: 0 0% 95% (Near white)
- Text Secondary: 220 5% 65% (Muted gray)

### B. Typography

**Font Stack**: 
- Primary: 'Inter' (Google Fonts) - Clean, modern, excellent for data/numbers
- Display: 'Montserrat' Bold (Headings, CTAs) - Strong, confident

**Hierarchy:**
- Hero Headlines: Montserrat Bold, 32px-40px
- Section Headers: Montserrat SemiBold, 24px-28px
- Card Titles: Inter SemiBold, 18px-20px
- Body: Inter Regular, 16px
- Caption/Meta: Inter Regular, 14px
- Credit Display: Montserrat Bold, 28px (prominent)

### C. Layout System

**Spacing Units**: Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card margins: gap-4, gap-6
- Screen padding: px-4, px-6

**Grid System:**
- Mobile: Single column, full-width cards
- Tablet: 2-column gym grid
- Desktop: 3-column gym grid, sidebar layouts

### D. Component Library

**Navigation:**
- Bottom Tab Bar (Fixed): 5 tabs with icons - Home, Gyms, Classes, Bookings, Scanner
- Icons from Heroicons Outline
- Active state: Primary color with solid icon variant

**Welcome/Onboarding:**
- Full-screen hero with fitness lifestyle imagery (people working out, gyms)
- Gradient overlay: linear-gradient(180deg, transparent, rgba(0,0,0,0.6))
- Large headline "FitBoom ga xush kelibsiz"
- 3-4 bullet points with icon badges
- CTA Button: "Boshlash" - Full width, Accent color, rounded-xl, py-4

**Credit Management Card:**
- Prominent header card with gradient background (Primary color gradient)
- Large credit number display (Montserrat Bold, 48px)
- "Kredit sotib olish" button with shimmer effect
- Purchase modal: 3 pricing cards in vertical stack
  - Card design: Surface background, border-2 on selected
  - Price: Montserrat Bold, Credit count: larger text
  - "Sotib olish" button per card

**Gym Listing Cards:**
- Card structure: Image top (16:9 ratio), content below
- Overlay badge: Credit cost (top-right, rounded-full, Primary bg, white text)
- Content: Gym name (Bold), Category tag, Distance with location icon, Hours
- Bottom: "Bron qilish" button (full-width in card)
- Hover: Subtle lift (shadow-lg)

**Filter Bar:**
- Horizontal scroll chips (rounded-full, border variant when inactive)
- Categories: Gym, Suzish, Yoga, Boks, etc.
- Search bar: Prominent, with search icon

**Online Classes:**
- Video thumbnail cards with play icon overlay
- Duration badge, instructor name
- Locked state for non-subscribers (blur + lock icon)

**My Bookings:**
- Timeline-style list with date separators
- Each booking: Gym image (small), name, time, QR code icon
- Swipe to cancel action
- History section (collapsed by default)

**QR Scanner:**
- Fixed bottom-right FAB (Floating Action Button)
- Size: w-16 h-16, rounded-full, Accent color, shadow-xl
- Icon: QR code scanner (white)
- Modal: Full-screen camera view with scanning frame overlay
- Scanning frame: Rounded corners, animated border pulse

### E. Imagery Strategy

**Hero Section (Welcome):**
- Large hero image: Dynamic fitness scene (group class, modern gym interior)
- Alternative: Video background (15-second loop, muted)

**Gym Listings:**
- High-quality gym photos showing equipment, space, atmosphere
- Consistent aspect ratio: 16:9 for uniformity
- Fallback: Gradient backgrounds with gym icons for missing images

**Online Classes:**
- Instructor/class preview thumbnails
- Overlay: Class type, duration, difficulty badge

**Empty States:**
- Illustration style: Line art fitness icons (weights, yoga pose, running)
- Friendly messaging in Uzbek

### F. Interactions & Animations

**Micro-interactions (Subtle Only):**
- Button press: Scale 0.98 on tap
- Card selection: Border color transition (200ms)
- Credit purchase success: Confetti burst (brief)
- QR scan success: Checkmark scale-in animation
- Tab switching: Slide transition (150ms)

**Loading States:**
- Skeleton screens for gym listings (shimmer effect)
- Spinner for credit purchase processing
- Progress bar for QR scanning

### G. Mobile-First Considerations

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Bottom sheet modals for filters, purchase flows
- Swipe gestures for booking management

**Performance:**
- Lazy load gym images
- Virtual scrolling for long lists
- Optimized QR scanner activation

**Accessibility:**
- High contrast mode support
- Large text support
- Screen reader labels (Uzbek)
- Haptic feedback on key actions (booking confirmation, QR scan success)

---

## Key Design Principles

1. **Clarity in Transactions**: Credit costs, remaining balance, and booking status must be immediately visible
2. **Fitness Energy**: Use vibrant imagery and energetic colors to inspire activity
3. **Seamless Flow**: Minimize steps from discovery → booking → check-in
4. **Trust & Security**: Clear pricing, secure payment flow, reliable QR system
5. **Localization**: Full Uzbek language support with cultural appropriateness