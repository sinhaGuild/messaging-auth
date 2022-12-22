import bcrypt from 'bcryptjs'
import { json, createCookieSessionStorage, redirect } from "@remix-run/node";
import {RegisterForm, LoginForm, prisma, createUser} from '~/utils'

//  get session secret from .env file. Error if not.
const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set')
}


//  create cookie session storage
const storage = createCookieSessionStorage({
    cookie: {
      name: 'kudos-session',
      secure: process.env.NODE_ENV === 'production',
      secrets: [sessionSecret],
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
    },
  })


//  create cookie session
export async function createUserSession(userId: string, redirectTo: string){
    //  create a new session from storage
    const session = await storage.getSession();
    //  sets the userId of that session to the id of the logged in user.
    session.set('userId', userId)
    return redirect(redirectTo, {   // redirect to the path specified.
        headers: {
            'Set-Cookie': await storage.commitSession(session)  //  commits the session when setting the cookie header.
        }
    })

}


export async function register(user: RegisterForm) {
    //  Check if the user exists
    const exists = await prisma.user.count({ where: { email: user.email } })
    //  if exists throw error
    if (exists) {
        return json({ error: `User with that email already exists.` }, { status: 400 })
    }
    // create new user in database
    const newUser = await createUser(user)
    if (!newUser) {
        return json(
            {
                error: `Something went wrong trying to create user`,
                fields: { email: user.email, password: user.password },
            },
            {
                status: 400,
            }
        )
    }

    return createUserSession(newUser.id, '/')

}

//  login function
export async function login({email, password}: LoginForm) {
    // fetch the user
    const user = await prisma.user.findUnique({where: {email}})
    //  error if fetch fails or password does not match
    if(!user || !(await bcrypt.compare(password, user.password))){
        return json({error: `Email or Password incorrect.`}, {status: 400})
    }

    //  all good, return id and email.
    // return {id: user.id, email}
    return createUserSession(user.id, "/")
}

// Helper functions

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
    const session = await getUserSession(request)
    const userId = session.get('userId')
    if (!userId || typeof userId !== 'string') {
      const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
      throw redirect(`/login?${searchParams}`)
    }
    return userId
  }
  
  function getUserSession(request: Request) {
    return storage.getSession(request.headers.get('Cookie'))
  }
  
  async function getUserId(request: Request) {
    const session = await getUserSession(request)
    const userId = session.get('userId')
    if (!userId || typeof userId !== 'string') return null
    return userId
  }
  
  export async function getUser(request: Request) {
    const userId = await getUserId(request)
    if (typeof userId !== 'string') {
      return null
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, profile: true },
      })
      return user
    } catch {
      throw logout(request)
    }
  }
  
  export async function logout(request: Request) {
    const session = await getUserSession(request)
    return redirect('/login', {
      headers: {
        'Set-Cookie': await storage.destroySession(session),
      },
    })
  }