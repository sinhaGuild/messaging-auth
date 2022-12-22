// app/routes/home.tsx

import { Profile, Kudo as IKudo, Prisma } from '@prisma/client'
import { LoaderFunction } from '@remix-run/node'
import { useLoaderData, Outlet } from '@remix-run/react'
import { json } from 'react-router'
import { Kudo, Layout, SearchBar, UserPanel } from '~/components'
import { requireUserId, getOtherUsers, getFilteredKudos, getUser } from '~/utils'

interface KudoWithProfile extends IKudo {
  author: {
    profile: Profile
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request)
  const user = await getUser(request)
  const users = await getOtherUsers(userId)

  const url = new URL(request.url)
  const sort = url.searchParams.get('sort')
  const filter = url.searchParams.get('filter')

  // 2
  let sortOptions: Prisma.KudoOrderByWithRelationInput = {}
  if (sort) {
    if (sort === 'date') {
      sortOptions = { createdAt: 'desc' }
    }
    if (sort === 'sender') {
      sortOptions = { author: { profile: { firstName: 'asc' } } }
    }
    if (sort === 'emoji') {
      sortOptions = { style: { emoji: 'asc' } }
    }
  }

  // 3
  let textFilter: Prisma.KudoWhereInput = {}
  if (filter) {
    textFilter = {
      OR: [
        { message: { mode: 'insensitive', contains: filter } },
        {
          author: {
            OR: [
              { profile: { is: { firstName: { mode: 'insensitive', contains: filter } } } },
              { profile: { is: { lastName: { mode: 'insensitive', contains: filter } } } },
            ],
          },
        },
      ],
    }
  }


  const kudos = await getFilteredKudos(userId, sortOptions, textFilter)
  
  return json({ users, kudos, user })
  
}

export default function Home() {
  const { users, kudos, user } = useLoaderData()
  return (
    <Layout>
      <Outlet />
      <div className="h-full flex">
        <UserPanel users={users} />
        <div className="flex-1 flex flex-col">
          {/* Search Bar Goes Here */}
          <SearchBar profile={user.profile}/>
          <div className="flex-1 flex">
            <div className="w-full p-10 flex flex-col gap-y-4">
              {kudos.map((kudo: KudoWithProfile) => (
                <Kudo key={kudo.id} kudo={kudo} profile={kudo.author.profile} />
              ))}
            </div>
            {/* Recent Kudos Goes Here */}
          </div>
        </div>
      </div>
    </Layout>
  );
}