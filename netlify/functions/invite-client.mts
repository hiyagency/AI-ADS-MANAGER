import type { Config } from '@netlify/functions'
import { json, requireAdmin, requirePost, requiredServerValue, respond } from './_lib/server.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async (request: Request) => respond(async () => {
  requirePost(request)
  const { admin } = await requireAdmin(request)
  const body = await request.json().catch(() => null) as { clientId?: string; email?: string; displayName?: string } | null
  const clientId = body?.clientId?.trim() ?? ''
  const email = body?.email?.trim().toLowerCase() ?? ''
  const displayName = body?.displayName?.trim() ?? ''
  if (!uuidPattern.test(clientId)) return json({ error: 'Choose a valid client workspace.' }, 400)
  if (!emailPattern.test(email) || email.length > 320) return json({ error: 'Enter a valid client email address.' }, 400)
  if (!displayName || displayName.length > 120) return json({ error: 'Enter a client display name.' }, 400)

  const { data: client, error: clientError } = await admin.from('clients').select('id, name, status').eq('id', clientId).maybeSingle()
  if (clientError || !client) return json({ error: 'The client workspace does not exist.' }, 404)
  if (client.status !== 'active') return json({ error: 'Enable the client workspace before inviting a login.' }, 409)

  const appUrl = requiredServerValue('PUBLIC_APP_URL').replace(/\/$/, '')
  const redirectOrigin = new URL(appUrl)
  if (redirectOrigin.protocol !== 'https:' && redirectOrigin.hostname !== 'localhost' && redirectOrigin.hostname !== '127.0.0.1') {
    return json({ error: 'PUBLIC_APP_URL must use HTTPS outside local development.' }, 500)
  }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/login`,
    data: { display_name: displayName },
  })
  if (inviteError || !invited.user) {
    const conflict = inviteError?.message.toLowerCase().includes('already')
    return json({ error: conflict ? 'This email already has an Auth account. Attach its existing profile instead.' : 'Supabase could not send the invitation.' }, conflict ? 409 : 502)
  }

  const userId = invited.user.id
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName,
    role: 'client',
    status: 'active',
  })
  const { error: membershipError } = profileError
    ? { error: profileError }
    : await admin.from('client_users').insert({ client_id: clientId, user_id: userId })

  if (membershipError) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    return json({ error: 'The invitation was rolled back because the client assignment could not be secured.' }, 500)
  }

  return json({ message: 'Invitation sent and client access attached.', userId }, 201)
})

export const config: Config = { path: '/api/invite-client' }
