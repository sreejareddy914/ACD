export interface Scenario {
  id: number;
  slug: string;
  title: string;
  type: 'deceptive' | 'legitimate' | 'clean';
  category: string;
  description: string;
  renderHtml: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    slug: 'fake-countdown',
    title: '1. Artificial Countdown Timer',
    type: 'deceptive',
    category: 'Fake Urgency',
    description: 'Flash sale timer ticking down with high-pressure deadline claim.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">Flash Sale</div>
        <h2 class="text-xl font-bold text-slate-900">AuraPulse Noise-Canceling Headphones</h2>
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p class="text-xs text-red-600 font-semibold uppercase tracking-wider">Hurry! Offer expires soon:</p>
          <div class="text-3xl font-mono font-bold text-red-700 my-1" id="demo-timer">04:59</div>
          <p class="text-xs text-red-600">Buy now before time runs out!</p>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-slate-900">$79.99</span>
          <span class="text-sm text-slate-400 line-through">$149.99</span>
        </div>
        <button class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md">Claim Deal Now</button>
      </div>
    `
  },
  {
    id: 2,
    slug: 'scarcity-message',
    title: '2. Fake Scarcity Claim',
    type: 'deceptive',
    category: 'Fake Scarcity',
    description: 'High-pressure low inventory message intended to induce FOMO.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-xl font-bold text-slate-900">Merino Wool Winter Overcoat</h2>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm font-semibold">
          <span>⚠️</span>
          <span>Only 2 left in stock! Almost sold out — high demand!</span>
        </div>
        <p class="text-sm text-slate-600">Crafted from 100% sustainably sourced Italian merino wool.</p>
        <div class="text-2xl font-bold text-slate-900">$289.00</div>
        <button class="w-full py-3 bg-slate-900 text-white font-bold rounded-lg">Add to Cart</button>
      </div>
    `
  },
  {
    id: 3,
    slug: 'legitimate-countdown',
    title: '3. Legitimate Event Schedule',
    type: 'legitimate',
    category: 'Clean / Informational',
    description: 'Standard event date notification without manufactured panic.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">Annual Conference</span>
        <h2 class="text-xl font-bold text-slate-900">DevCon Global 2026</h2>
        <p class="text-sm text-slate-600">The premier gathering for systems software and distributed architectures.</p>
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p class="text-xs text-slate-500 font-medium">Conference dates: October 24–26, 2026</p>
          <p class="text-sm text-slate-800 font-semibold mt-1">General attendee registration opens in 14 days.</p>
        </div>
        <button class="py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg text-sm">Add to Calendar</button>
      </div>
    `
  },
  {
    id: 4,
    slug: 'correct-discount',
    title: '4. Correct Discount Calculation',
    type: 'legitimate',
    category: 'Legitimate Pricing',
    description: 'Mathematically accurate discount arithmetic ($100 reduced to $70 is 30% off).',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-xl font-bold text-slate-900">Ergonomic Office Chair Pro</h2>
        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-slate-900">$70.00</span>
          <span class="text-base text-slate-400 line-through">$100.00</span>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">Save 30%</span>
        </div>
        <p class="text-sm text-slate-600">Breathable mesh lumbar support with 4D adjustable armrests.</p>
        <button class="w-full py-2.5 bg-slate-900 text-white font-bold rounded-lg text-sm">Purchase</button>
      </div>
    `
  },
  {
    id: 5,
    slug: 'incorrect-discount',
    title: '5. Incorrect Discount Calculation',
    type: 'deceptive',
    category: 'Misleading Discounts',
    description: 'Claims 50% discount on $100 -> $80 (actual math is only 20% off).',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <span class="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded uppercase">Deceptive Arithmetic</span>
        <h2 class="text-xl font-bold text-slate-900">Titanium Chef Knife Set</h2>
        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-slate-900">$80.00</span>
          <span class="text-base text-slate-400 line-through">$100.00</span>
          <span class="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded">50% OFF!</span>
        </div>
        <p class="text-xs text-red-600 font-medium">Claimed 50% discount, but actual math: ($100 - $80)/$100 = 20% off.</p>
        <button class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm">Buy Now</button>
      </div>
    `
  },
  {
    id: 6,
    slug: 'clear-shipping-fee',
    title: '6. Clearly Disclosed Shipping Fee',
    type: 'legitimate',
    category: 'Transparent Pricing',
    description: 'Upfront delivery fee breakdown without hidden surcharges.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 class="text-base font-bold text-slate-900">Order Summary</h2>
        <div class="space-y-1.5 text-sm text-slate-600">
          <div class="flex justify-between"><span>Items Subtotal:</span><span>$45.00</span></div>
          <div class="flex justify-between"><span>Standard Ground Shipping:</span><span>$5.00</span></div>
          <div class="flex justify-between font-bold text-slate-900 pt-2 border-t"><span>Total:</span><span>$50.00</span></div>
        </div>
        <button class="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-sm">Proceed to Checkout</button>
      </div>
    `
  },
  {
    id: 7,
    slug: 'hidden-checkout-fee',
    title: '7. Unexplained Checkout Fee (Drip Pricing)',
    type: 'deceptive',
    category: 'Hidden Charges & Drip Pricing',
    description: 'Late disclosed mandatory convenience and platform fees at checkout.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 class="text-base font-bold text-slate-900">Checkout Step 3: Payment</h2>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          <p class="font-bold">Mandatory service fee applied: $12.50</p>
          <p>Platform fee added: $4.00</p>
        </div>
        <div class="space-y-1.5 text-sm">
          <div class="flex justify-between text-slate-500"><span>Advertised Item:</span><span>$39.99</span></div>
          <div class="flex justify-between text-red-600 font-semibold"><span>Undisclosed Convenience Fee:</span><span>$16.50</span></div>
          <div class="flex justify-between font-bold text-slate-900 pt-2 border-t text-base"><span>Final Total:</span><span>$56.49</span></div>
        </div>
        <button class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm">Pay Now</button>
      </div>
    `
  },
  {
    id: 8,
    slug: 'forced-signup-modal',
    title: '8. Forced Sign-Up Blocking Wall',
    type: 'deceptive',
    category: 'Forced Sign-Up',
    description: 'Mandatory registration wall blocking content without a skip or close control.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4" role="dialog">
        <div class="text-center space-y-2">
          <div class="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">🔒</div>
          <h2 class="text-lg font-bold text-slate-900 modal-title">Create an account to continue</h2>
          <p class="text-xs text-slate-500">You must register now to proceed reading this product review.</p>
        </div>
        <div class="space-y-2">
          <input type="text" placeholder="Full Name" class="w-full p-2 border rounded text-xs" />
          <input type="email" placeholder="Work Email" class="w-full p-2 border rounded text-xs" />
        </div>
        <button class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-xs">Create Account</button>
        <p class="text-[10px] text-center text-slate-400">No guest access or skip option available.</p>
      </div>
    `
  },
  {
    id: 9,
    slug: 'preselected-paid-addon',
    title: '9. Preselected Paid Add-On',
    type: 'deceptive',
    category: 'Preselected Options',
    description: 'Paid extended warranty checkbox pre-ticked by default.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Smartphone Accessories</h2>
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <label class="flex items-start gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
            <input type="checkbox" checked class="mt-0.5 rounded text-blue-600 w-4 h-4" />
            <div>
              <span>Add 2-Year Extended Protection Plan for $29.99</span>
              <p class="text-[11px] text-slate-500 font-normal">Preselected by default unless you manually uncheck it.</p>
            </div>
          </label>
        </div>
        <button class="w-full py-2.5 bg-slate-900 text-white font-bold rounded-lg text-sm">Add to Bag</button>
      </div>
    `
  },
  {
    id: 10,
    slug: 'normal-optional-checkbox',
    title: '10. Normal Optional Checkbox',
    type: 'legitimate',
    category: 'Legitimate Options',
    description: 'Unchecked optional newsletter consent giving user full choice.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Communication Preferences</h2>
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <label class="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" class="mt-0.5 rounded text-blue-600 w-4 h-4" />
            <div>
              <span class="font-semibold text-slate-800">Send me periodic product updates (optional)</span>
              <p class="text-[11px] text-slate-500 font-normal">Unchecked by default. You can opt in if desired.</p>
            </div>
          </label>
        </div>
        <button class="py-2 px-4 bg-slate-800 text-white font-semibold rounded-lg text-xs">Save Settings</button>
      </div>
    `
  },
  {
    id: 11,
    slug: 'unclear-subscription-renewal',
    title: '11. Subscription Trap / Hidden Renewal',
    type: 'deceptive',
    category: 'Subscription Traps & Continuity',
    description: 'Free trial that silently converts to a recurring paid plan with fine print.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-center">
        <span class="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">PRO MEMBERSHIP</span>
        <h2 class="text-2xl font-extrabold text-slate-900">Start Your 7-Day Free Trial</h2>
        <p class="text-xs text-slate-600">Access unlimited streaming, cloud backup, and premium filters.</p>
        <button class="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm text-sm">Start Free Trial Now</button>
        <p class="text-[8px] text-slate-400 leading-tight">
          * Automatically renews at full price of $199.99 billed annually after trial expires unless canceled 48 hours prior.
        </p>
      </div>
    `
  },
  {
    id: 12,
    slug: 'clear-subscription-renewal',
    title: '12. Transparent Subscription Terms',
    type: 'legitimate',
    category: 'Transparent Subscriptions',
    description: 'Clear trial period, exact billing date, exact recurring price, and 1-click cancel.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 class="text-base font-bold text-slate-900">Developer Cloud Pro</h2>
        <p class="text-xs text-slate-600">Enjoy 14 days of complimentary access with zero commitment.</p>
        <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 space-y-1">
          <p><strong>Trial ends:</strong> November 14, 2026</p>
          <p><strong>Renewal price:</strong> $15.00 / month starting November 15</p>
          <p><strong>Cancellation:</strong> 1-click online cancellation anytime in your dashboard</p>
        </div>
        <button class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-xs">Begin 14-Day Trial</button>
      </div>
    `
  },
  {
    id: 13,
    slug: 'confirmshaming',
    title: '13. Confirmshaming Dialog',
    type: 'deceptive',
    category: 'Confirmshaming',
    description: 'Manipulative opt-out button phrasing designed to induce guilt.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-center">
        <div class="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">🎁</div>
        <h2 class="text-lg font-bold text-slate-900">Unlock 25% Off Your Entire Order!</h2>
        <p class="text-xs text-slate-600">Join our VIP club today and save immediately on all electronics.</p>
        <button class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs">YES! GIVE ME MY 25% DISCOUNT</button>
        <button class="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer">
          No thanks, I hate discounts and prefer paying full price
        </button>
      </div>
    `
  },
  {
    id: 14,
    slug: 'normal-newsletter-signup',
    title: '14. Normal Newsletter Prompt',
    type: 'legitimate',
    category: 'Neutral Dialog',
    description: 'Standard, polite newsletter sign-up with neutral decline action.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 class="text-base font-bold text-slate-900">Weekly Tech Digest</h2>
        <p class="text-xs text-slate-600">Get curated software architecture essays delivered every Tuesday.</p>
        <div class="flex gap-2">
          <input type="email" placeholder="you@domain.com" class="flex-1 p-2 border rounded text-xs" />
          <button class="py-2 px-3 bg-slate-900 text-white font-semibold rounded text-xs">Subscribe</button>
        </div>
        <button class="text-xs text-slate-400 hover:text-slate-600">No thanks</button>
      </div>
    `
  },
  {
    id: 15,
    slug: 'repeated-promotional-popup',
    title: '15. Exit-Intent Nagging Dialog',
    type: 'deceptive',
    category: 'Nagging',
    description: 'Aggressive interruption prompt triggering on tab departure.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3 text-center">
        <span class="text-2xl">🛑</span>
        <h2 class="text-base font-bold text-slate-900">Wait! Don't leave yet!</h2>
        <p class="text-xs text-slate-600 font-semibold">Still haven't signed up? Are you still there? Sign up now!</p>
        <p class="text-[11px] text-slate-500">We noticed you didn't subscribe to notifications before exiting.</p>
        <button class="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs">Stay & Get 10% Off</button>
      </div>
    `
  },
  {
    id: 16,
    slug: 'difficult-cancellation',
    title: '16. Roach Motel / Difficult Cancellation',
    type: 'deceptive',
    category: 'Difficult Cancellation (Roach Motel)',
    description: 'Requires users to phone a call center during limited hours to cancel an online service.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Membership Cancellation</h2>
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-1">
          <p class="font-bold">Cancellation only by phone:</p>
          <p>Please call to cancel between 9am-11am EST on weekdays, or mail in written notice to cancel.</p>
        </div>
        <p class="text-xs text-slate-600">Online 1-click cancellation has been disabled for security reasons.</p>
        <button class="w-full py-2 bg-slate-200 text-slate-600 font-bold rounded text-xs cursor-not-allowed">Cancel Online (Disabled)</button>
      </div>
    `
  },
  {
    id: 17,
    slug: 'privacy-visual-imbalance',
    title: '17. Asymmetric Privacy Cookie Banner',
    type: 'deceptive',
    category: 'Privacy Manipulation',
    description: 'Prominent Accept All button with hidden, subdued settings and missing Reject All.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3 cookie-banner" id="cookie-banner">
        <h3 class="text-sm font-bold text-slate-900">We Value Your Privacy</h3>
        <p class="text-xs text-slate-600">We and our 240 ad partners use cookies to personalize ads and track your browsing activity across websites.</p>
        <div class="flex items-center gap-3 pt-2">
          <button class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs" id="accept-cookies">Accept All</button>
          <a href="#settings" class="text-[9px] text-slate-400 hover:text-slate-600 opacity-50 underline" id="manage-cookies">Manage Preferences</a>
        </div>
      </div>
    `
  },
  {
    id: 18,
    slug: 'suspicious-job-offer',
    title: '18. Deceptive Job / Placement Guarantee',
    type: 'deceptive',
    category: 'Job & Training Solicitation',
    description: 'Claims 100% placement guarantee while requiring an upfront application processing fee.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">TRAINING & PLACEMENT</span>
        <h2 class="text-lg font-bold text-slate-900">Full-Stack Engineering Internship</h2>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
          <p class="font-bold">100% guaranteed placement after training program!</p>
          <p>Pay registration fee to interview and secure your reserved training seat.</p>
        </div>
        <p class="text-xs text-slate-600">Pay application processing fee of $199 to finalize your offer letter.</p>
        <button class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-xs">Pay Fee & Apply</button>
      </div>
    `
  },
  {
    id: 19,
    slug: 'clean-ecommerce',
    title: '19. Clean Ecommerce Product Page',
    type: 'clean',
    category: 'Clean / Ethical Design',
    description: 'Clear pricing, transparent policies, and unhurried design.',
    renderHtml: `
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-xl font-bold text-slate-900">Handcrafted Ceramic Coffee Dripper</h2>
        <p class="text-sm text-slate-600">Slow-pour cone dripper made by local potters in Vermont. Microwave and dishwasher safe.</p>
        <div class="text-2xl font-bold text-slate-900">$34.00</div>
        <div class="text-xs text-slate-500 space-y-1">
          <p>• Free standard shipping on all orders</p>
          <p>• 30-day hassle-free return window</p>
        </div>
        <button class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm">Add to Basket</button>
      </div>
    `
  },
  {
    id: 20,
    slug: 'clean-informational',
    title: '20. Clean Informational Article',
    type: 'clean',
    category: 'Clean / Informational',
    description: 'Neutral encyclopedia article without advertising or manipulative signals.',
    renderHtml: `
      <article class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h1 class="text-xl font-bold text-slate-900">Photovoltaic Solar Power: Historical Overview</h1>
        <p class="text-xs text-slate-600 leading-relaxed">
          The photovoltaic effect was first experimentally observed by French physicist Edmond Becquerel in 1839. In 1883, Charles Fritts constructed the first solid-state selenium photovoltaic cell. Modern silicon solar cells originated at Bell Laboratories in 1954, achieving an initial energy conversion efficiency of 6 percent.
        </p>
        <p class="text-xs text-slate-600 leading-relaxed">
          Throughout the 1970s and 1980s, commercial deployment expanded rapidly in remote off-grid installations, navigational aids, and telecommunications repeaters.
        </p>
        <div class="pt-2 text-[11px] text-slate-400 border-t">
          <span>Sources: National Renewable Energy Laboratory (NREL), Department of Energy Historical Archives.</span>
        </div>
      </article>
    `
  }
];
