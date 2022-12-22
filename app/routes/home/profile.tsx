// app/routes/home/profile.tsx

import { ActionFunction, json, LoaderFunction, redirect } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { useState } from "react";
import { FormField, Modal, SelectBox } from "~/components";
import { departments, getUser, requireUserId, updateUser, validateName } from "~/utils";
import type { Department} from '@prisma/client'

//  Loader function
export const loader: LoaderFunction = async ({ request }) => {
    const user = await getUser(request)
    return json({ user })
}


//  Action Function

export const action: ActionFunction = async ({ request }) => {
    const form = await request.formData();
    const userId = await requireUserId(request);
    // 1
    let firstName = form.get('firstName')
    let lastName = form.get('lastName')
    let department = form.get('department')
 
    // 2
    if (
       typeof firstName !== 'string'
       || typeof lastName !== 'string'
       || typeof department !== 'string'
    ) {
       return json({ error: `Invalid Form Data` }, { status: 400 });
    }
 
    // 3
    const errors = {
       firstName: validateName(firstName),
       lastName: validateName(lastName),
       department: validateName(department)
    }
 
    if (Object.values(errors).some(Boolean))
       return json({ errors, fields: { department, firstName, lastName } }, { status: 400 });
 
    // Update the user here...
    await updateUser(userId, {
          firstName,
          lastName,
          department: department as Department
        })
 
    // 4
    return redirect('/home')
 }

export default function ProfileSettings() {
    const { user } = useLoaderData()

    // 2
    const [formData, setFormData] = useState({
        firstName: user?.profile?.firstName,
        lastName: user?.profile?.lastName,
        department: (user?.profile?.department || 'MARKETING'),
    })


    // 3
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
        setFormData(form => ({ ...form, [field]: event.target.value }))
    }

    return (
        <Modal isOpen={true} className="w-1/3">
            <div className="p-3">
                <h2 className="text-4xl font-semibold text-blue-600 text-center mb-4">Your Profile</h2>
                <div className="flex">
                    <div className="flex-1">
                        <form method="post">
                            <FormField htmlFor="firstName" label="First Name" value={formData.firstName} onChange={e => handleInputChange(e, 'firstName')} />
                            <FormField htmlFor="lastName" label="Last Name" value={formData.lastName} onChange={e => handleInputChange(e, 'lastName')} />
                            <SelectBox
                                className="w-full rounded-xl px-3 py-2 text-gray-400"
                                id="department"
                                label="Department"
                                name="department"
                                options={departments}
                                value={formData.department}
                                onChange={e => handleInputChange(e, 'department')}
                            />
                            <div className="w-full text-right mt-4">
                                <button className="rounded-xl bg-yellow-300 font-semibold text-blue-600 px-16 py-2 transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Modal>
    )
}