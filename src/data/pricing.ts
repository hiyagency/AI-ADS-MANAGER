import type { NichePricing } from '../types'

const ranges = (
  r200: [number, number], r400: [number, number], r600: [number, number], r800: [number, number],
  r950: [number, number], r1250: [number, number], r1500: [number, number],
) => ({
  200: { min: r200[0], max: r200[1] }, 400: { min: r400[0], max: r400[1] },
  600: { min: r600[0], max: r600[1] }, 800: { min: r800[0], max: r800[1] },
  950: { min: r950[0], max: r950[1] }, 1250: { min: r1250[0], max: r1250[1] },
  1500: { min: r1500[0], max: r1500[1] },
})

export const NICHE_PRICING: NichePricing[] = [
  { id: 'hospital', name: 'Hospital', category: 'Healthcare', destination: 'Call / WhatsApp', estimates: ranges([16,32],[29,58],[40,78],[47,93],[50,99],[55,109],[57,112]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'general-clinic', name: 'General / Specialty Clinic', category: 'Healthcare', destination: 'Call / WhatsApp', estimates: ranges([28,56],[51,104],[70,140],[82,168],[88,178],[97,195],[100,200]), qualifiedRate: { min: 35, max: 55 } },
  { id: 'dentist', name: 'Dentist', category: 'Healthcare', destination: 'WhatsApp / Call', estimates: ranges([31,63],[57,116],[77,156],[92,185],[98,198],[108,217],[111,223]), qualifiedRate: { min: 35, max: 55 } },
  { id: 'diagnostic', name: 'Diagnostic / Pathology', category: 'Healthcare', destination: 'WhatsApp / Call', estimates: ranges([35,70],[64,130],[87,175],[103,208],[110,222],[122,244],[125,250]), qualifiedRate: { min: 40, max: 60 } },
  { id: 'physiotherapy', name: 'Physiotherapy', category: 'Healthcare', destination: 'WhatsApp', estimates: ranges([37,80],[69,140],[93,200],[110,238],[118,254],[129,278],[133,288]), qualifiedRate: { min: 35, max: 55 } },
  { id: 'cosmetic-clinic', name: 'Skin / Hair / Cosmetic Clinic', category: 'Healthcare', destination: 'Instagram / WhatsApp', estimates: ranges([25,58],[47,104],[63,140],[75,168],[80,178],[88,195],[90,200]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'playschool', name: 'Playschool', category: 'Education', destination: 'WhatsApp / Call', estimates: ranges([43,94],[79,173],[107,234],[127,277],[135,296],[149,325],[153,334]), qualifiedRate: { min: 35, max: 55 } },
  { id: 'k12-school', name: 'K-12 / High School', category: 'Education', destination: 'WhatsApp / Call', estimates: ranges([25,58],[47,104],[63,140],[75,168],[80,178],[88,195],[90,200]), qualifiedRate: { min: 30, max: 50 } },
  { id: 'coaching', name: 'Coaching / Tuition', category: 'Education', destination: 'WhatsApp', estimates: ranges([37,80],[69,140],[93,200],[110,238],[118,254],[129,278],[133,288]), qualifiedRate: { min: 30, max: 50 } },
  { id: 'college', name: 'College / Skill Institute', category: 'Education', destination: 'WhatsApp / Instagram', estimates: ranges([28,63],[51,116],[70,156],[82,185],[88,198],[97,217],[100,223]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'jewellery', name: 'Jewellery Store', category: 'Retail', destination: 'Instagram / WhatsApp', estimates: ranges([25,58],[47,104],[63,140],[75,168],[80,178],[88,195],[90,200]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'franchise-fashion', name: 'Franchise Clothing Outlet', category: 'Retail', destination: 'Instagram / WhatsApp', estimates: ranges([50,112],[94,208],[127,280],[150,332],[161,355],[176,390],[181,400]), qualifiedRate: { min: 15, max: 30 } },
  { id: 'boutique', name: 'Local Boutique / Fashion', category: 'Retail', destination: 'Instagram', estimates: ranges([62,140],[115,260],[155,350],[184,415],[197,444],[216,487],[222,500]), qualifiedRate: { min: 15, max: 30 } },
  { id: 'electronics', name: 'Electronics / Mobile Store', category: 'Retail', destination: 'WhatsApp', estimates: ranges([43,94],[79,173],[107,234],[127,277],[135,296],[149,325],[153,334]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'furniture', name: 'Furniture / Home Decor', category: 'Retail', destination: 'WhatsApp / Instagram', estimates: ranges([28,63],[51,116],[70,156],[82,185],[88,198],[97,217],[100,223]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'auto-dealer', name: 'Auto / Two-Wheeler Dealer', category: 'Retail', destination: 'WhatsApp / Call', estimates: ranges([21,47],[39,87],[53,117],[63,139],[68,148],[74,163],[76,167]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'gym', name: 'Gym / Fitness', category: 'Lifestyle & Hospitality', destination: 'WhatsApp / Instagram', estimates: ranges([56,125],[103,231],[140,312],[165,369],[177,395],[194,433],[200,445]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'salon', name: 'Salon / Beauty', category: 'Lifestyle & Hospitality', destination: 'Instagram / WhatsApp', estimates: ranges([62,140],[115,260],[155,350],[184,415],[197,444],[216,487],[222,500]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'restaurant', name: 'Restaurant / Café', category: 'Lifestyle & Hospitality', destination: 'WhatsApp / Instagram', estimates: ranges([70,160],[129,297],[175,400],[207,475],[220,507],[245,568],[250,572]), qualifiedRate: { min: 10, max: 25 } },
  { id: 'hotel', name: 'Hotel / Resort', category: 'Lifestyle & Hospitality', destination: 'WhatsApp / Call', estimates: ranges([31,70],[57,130],[77,175],[92,208],[98,222],[108,244],[111,250]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'events', name: 'Event / Banquet / Wedding', category: 'Lifestyle & Hospitality', destination: 'WhatsApp / Call', estimates: ranges([25,58],[47,104],[63,140],[75,168],[80,178],[88,195],[90,200]), qualifiedRate: { min: 25, max: 45 } },
  { id: 'real-estate', name: 'Real Estate', category: 'Business & Property', destination: 'Call / WhatsApp', estimates: ranges([11,26],[20,48],[28,64],[33,78],[35,81],[38,89],[40,91]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'interiors', name: 'Interiors / Home Services', category: 'Business & Property', destination: 'WhatsApp / Call', estimates: ranges([18,44],[34,80],[46,108],[55,128],[59,137],[64,150],[66,154]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'solar', name: 'Solar Rooftop', category: 'Business & Property', destination: 'Call / WhatsApp', estimates: ranges([16,38],[29,70],[40,94],[47,111],[50,119],[55,130],[57,134]), qualifiedRate: { min: 20, max: 40 } },
  { id: 'b2b', name: 'B2B / Professional Services', category: 'Business & Property', destination: 'Call / WhatsApp', estimates: ranges([9,23],[17,42],[23,58],[27,67],[29,71],[32,78],[33,80]), qualifiedRate: { min: 15, max: 35 } },
]

export const FEATURED_NICHE_IDS = ['restaurant', 'boutique', 'salon', 'gym', 'franchise-fashion'] as const
export const FEATURED_NICHES = FEATURED_NICHE_IDS.map((id) => NICHE_PRICING.find((niche) => niche.id === id)!)
