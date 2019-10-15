import boolean from 'boolean';

export async function getGoogleAuthConfig(req, res) {
  const enabled = boolean(process.env.GOOGLE_ENABLED);
  res.status(200).json({ enabled });
}