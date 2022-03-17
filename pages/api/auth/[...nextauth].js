import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import spotifyApi, { LOGIN_URL } from '../../../lib/Spotify';

async function refreshAccessToken(token) {
	try {
		spotifyApi.setAccessToken(token.accessToken);
		spotifyApi.setAccessToken(token.refreshToken);

		const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
		console.log('Refreshed Token is', refreshedToken);
		return {
			...token,
			accessToken: refreshedToken.access_token,
			accessTokenExpires: Date.now + refreshedToken.expires_in * 1000, // = 1 hour as 3600 returns from Spotify API
			refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
			// Replace if new refresh token comes back from Spotify else use old refresh token
		};
	} catch (error) {
		console.error(error);

		return {
			...token,
			error: 'RefreshAccessTokenError',
		};
	}
}
export default NextAuth({
	providers: [
		SpotifyProvider({
			clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
			clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
			authorization: LOGIN_URL,
		}),
	],
	secret: process.env.JWT_SECRET,
	pages: {
		signIn: '/login',
	},
	callbacks: {
		async jwt({ token, account, user }) {
			//1. Intial sign in
			if (account && user) {
				return {
					...token,
					accessToken: account.access_token,
					refreshToken: account.refresh_token,
					username: account.providerAccountId,
					accessTokenExpires: account.expires_at * 1000,
				};
			}

			//2. Return previous token if the access token has not expired

			if (Date.now() < token.accessTokenExpires) {
				console.log('Existing Access Token is Valid');
				return token;
			}

			//3. Access token has expired, so we need to refresh it
			console.log('Access Token has Expired, Refreshing...');
			return await refreshAccessToken(token);
		},
		async session({ session, token }) {
			session.user.accessToken = token.accessToken;
			session.user.refreshToken = token.refreshToken;
			session.user.username = token.username;

			return session;
		},
	},
});
