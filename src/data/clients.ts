export type ClientDriveFolder = {
  name: string
  url: string
}

export type ClientInfo = {
  id: string
  name: string
  projectKey?: string
  status: 'active' | 'paused' | 'completed' | string
  description: string
  contactName: string
  contactEmail: string
  driveFolderUrl: string
  driveFolderId: string
  goals: string[]
  initiatives: string[]
  notes?: string[]
  subfolders?: ClientDriveFolder[]
}

export const clients: ClientInfo[] = [
  {
    id: 'megan-may',
    name: 'Megan May',
    projectKey: 'MeganMay',
    status: 'active',
    description:
      'Ongoing digital marketing and lead-gen work; we run paid campaigns, web copy, and reporting for this client.',
    contactName: 'Victor Subia',
    contactEmail: 'victor@insiderclicks.com',
    driveFolderId: '1Ou-r5lhcapFjWdW7wOmsaNOagDjfzh8s',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1Ou-r5lhcapFjWdW7wOmsaNOagDjfzh8s',
    goals: ['Keep campaigns profitable', 'Keep the Kanban board synced with new requests'],
    initiatives: ['Weekly reporting package', 'Automate Canva-to-drive handoff'],
    notes: ['Assets and briefs will live in the Drive folder; keep the board entry in sync when you deliver something.'],
    subfolders: [
      { name: 'Briefs', url: 'https://drive.google.com/drive/folders/17Jz8DS_RYgQNx8ZDSivHQPchxdr7hmJB' },
      { name: 'Deliverables', url: 'https://drive.google.com/drive/folders/1dZO7H7d6rwlPGdfUM1is0Ze_SZAGDwni' },
      { name: 'Assets', url: 'https://drive.google.com/drive/folders/14hfJm1Xm2Iuet3YWUF365RXZFCEzWewL' },
      { name: 'References', url: 'https://drive.google.com/drive/folders/1ALAE7XJ2PrRAUTL3e_4NwCUBOqd_YNJp' },
    ],
  },
  {
    id: 'phoinix-transformations',
    name: 'Phoinix Transformations',
    projectKey: 'Phoinix',
    status: 'active',
    description:
      'Brand refresh and customer journey map for Phoinix Transformations; focus on client storytelling, funnels, and creative assets.',
    contactName: 'Victor Subia',
    contactEmail: 'victor@insiderclicks.com',
    driveFolderId: '1rHa1RW_KeJJO0eIHhOc7WPVJN7fmR8FF',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1rHa1RW_KeJJO0eIHhOc7WPVJN7fmR8FF',
    goals: ['Document the client journey and approvals for every new deliverable', 'Keep track of creative requests and approvals'],
    initiatives: ['Create a shared creative brief template', 'Keep a running list of open requests inside the Cyra Command Center'],
    notes: ['Use the Drive folder for every finalized asset so Victor and I both have a single source of truth.'],
    subfolders: [
      { name: 'Briefs', url: 'https://drive.google.com/drive/folders/1hDTi0nyH2g-ctiWFQjDONkS7SEinr_J0' },
      { name: 'Deliverables', url: 'https://drive.google.com/drive/folders/1pJ5P-KsJFPNnb71D02VXMkGTSs9iyXIc' },
      { name: 'Assets', url: 'https://drive.google.com/drive/folders/1q5ztVpdjaKMi4k40Ce69RD0TRTcCGUMm' },
      { name: 'References', url: 'https://drive.google.com/drive/folders/1VKysKDS4ScAv0I0Z-s3e95YAUPeBam4H' },
    ],
  },
]
