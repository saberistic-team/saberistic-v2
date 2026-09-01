export const approvedGiftProductHosts = [
  'adafruit.com',
  'aeropress.com',
  'barnesandnoble.com',
  'bellroy.com',
  'fieldnotesbrand.com',
  'fellowproducts.com',
  'grovemade.com',
  'ifixit.com',
  'jetpens.com',
  'keychron.com',
  'leevalley.com',
  'logitech.com',
  'muji.us',
  'nostarch.com',
  'orbitkey.com',
  'peakdesign.com',
  'phaidon.com',
  'rei.com',
  'simplehuman.com',
  'sparkfun.com',
  'store.moma.org',
  'taschen.com',
  'theyamazakihome.com',
  'ugmonk.com',
  'uncommongoods.com',
  'www.adafruit.com',
  'www.aeropress.com',
  'www.barnesandnoble.com',
  'www.bellroy.com',
  'www.bhphotovideo.com',
  'www.fieldnotesbrand.com',
  'www.fellowproducts.com',
  'www.grovemade.com',
  'www.ifixit.com',
  'www.jetpens.com',
  'www.keychron.com',
  'www.leevalley.com',
  'www.logitech.com',
  'www.muji.us',
  'www.nostarch.com',
  'www.orbitkey.com',
  'www.peakdesign.com',
  'www.phaidon.com',
  'www.rei.com',
  'www.simplehuman.com',
  'www.sparkfun.com',
  'www.taschen.com',
  'www.theyamazakihome.com',
  'www.ugmonk.com',
  'www.uncommongoods.com',
] as const

const underThirtyGiftProductHosts: ReadonlySet<string> = new Set([
  'barnesandnoble.com',
  'fieldnotesbrand.com',
  'ifixit.com',
  'jetpens.com',
  'muji.us',
  'nostarch.com',
  'sparkfun.com',
  'store.moma.org',
  'uncommongoods.com',
  'www.barnesandnoble.com',
  'www.fieldnotesbrand.com',
  'www.ifixit.com',
  'www.jetpens.com',
  'www.muji.us',
  'www.nostarch.com',
  'www.sparkfun.com',
  'www.uncommongoods.com',
])

const approvedGiftProductHostSet: ReadonlySet<string> = new Set(approvedGiftProductHosts)

const retailerNameByHost: Readonly<Record<string, string>> = {
  'adafruit.com': 'Adafruit',
  'aeropress.com': 'AeroPress',
  'barnesandnoble.com': 'Barnes & Noble',
  'bellroy.com': 'Bellroy',
  'bhphotovideo.com': 'B&H Photo Video',
  'fieldnotesbrand.com': 'Field Notes',
  'fellowproducts.com': 'Fellow',
  'grovemade.com': 'Grovemade',
  'ifixit.com': 'iFixit',
  'jetpens.com': 'JetPens',
  'keychron.com': 'Keychron',
  'leevalley.com': 'Lee Valley',
  'logitech.com': 'Logitech',
  'muji.us': 'MUJI',
  'nostarch.com': 'No Starch Press',
  'orbitkey.com': 'Orbitkey',
  'peakdesign.com': 'Peak Design',
  'phaidon.com': 'Phaidon',
  'rei.com': 'REI',
  'simplehuman.com': 'simplehuman',
  'sparkfun.com': 'SparkFun',
  'store.moma.org': 'MoMA Design Store',
  'taschen.com': 'TASCHEN',
  'theyamazakihome.com': 'Yamazaki Home',
  'ugmonk.com': 'Ugmonk',
  'uncommongoods.com': 'Uncommon Goods',
}

export const verifiableGiftProductHosts = [
  'adafruit.com',
  'ifixit.com',
  'store.moma.org',
  'uncommongoods.com',
  'www.adafruit.com',
  'www.ifixit.com',
  'www.uncommongoods.com',
] as const

const verifiableGiftProductHostSet: ReadonlySet<string> = new Set(verifiableGiftProductHosts)

export function isApprovedGiftProductHost(hostname: string): boolean {
  return approvedGiftProductHostSet.has(hostname.toLowerCase())
}

/** The display name is controlled by the approved host, never by model-authored metadata. */
export function giftProductRetailerName(hostname: string): string | null {
  const normalized = hostname.toLowerCase()
  if (!isApprovedGiftProductHost(normalized)) return null
  const host = normalized.startsWith('www.') ? normalized.slice(4) : normalized
  return retailerNameByHost[host] ?? null
}

export function isVerifiableGiftProductHost(hostname: string): boolean {
  return verifiableGiftProductHostSet.has(hostname.toLowerCase())
}

export function giftProductHostFamily(hostname: string): string | null {
  const normalized = hostname.toLowerCase()
  if (!isVerifiableGiftProductHost(normalized)) return null
  return normalized.startsWith('www.') ? normalized.slice(4) : normalized
}

export function giftSearchProductHosts(budget: string): readonly string[] {
  return approvedGiftProductHosts.filter(
    (host) => budget !== 'under_30' || underThirtyGiftProductHosts.has(host),
  )
}
