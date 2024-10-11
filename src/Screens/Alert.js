/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';

const Alert = ({BaseUrl, Url}) => {

    const [notifications, setNotifications] = useState([]);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${BaseUrl}/alert`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data)
            setNotifications(data);
            sendNotifications(data);
        } catch (error) {
            console.error('Fetch Error:', error);
        }
    };

    const sendNotifications = async (notificationsArray) => {
        for (const notification of notificationsArray) {
            await updateData(notification);
        }
        console.log('All notifications updated successfully');
    };


    const updateData = async (newData) => {
        try {
            const response = await fetch(`${Url}/alert`, {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newData),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const updatedData = await response.json();
            console.log(updatedData)
        } catch (err) {
            console.log(err.message);
        }
    };
    useEffect(() => {

        fetchNotifications();
        //updateData(notifications)
        // Set up interval for fetching notifications every 5 seconds
        const intervalId = setInterval(fetchNotifications, 60000);

        return () => clearInterval(intervalId);
    }, [notifications]);


    useEffect(() => {
        const link = window.location.href;
        if (link.includes("alert")) {
            const ele = document.getElementById("alert");
            if (ele) {
                ele.style.borderBottom = "2px solid #C37C5A";
            }
        }
    }, []);

    return (
        <div className="p-4">
            <div className="m-2">
                <div className="text-white text-xl font-bold">
                    <div className="mb-2 flex justify-between mt-5">
                        <span>Notifications</span>
                        <button className="border-2 border-[#24514D] rounded-lg px-4 py-2 text-[#68BFB6] text-base flex items-center bg-transparent p-1">
                            All
                            <img src="assets/Polygon 1.png" alt="" className="ml-2" />
                        </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto rounded-lg scrollbar-custom">
                        <table className="w-full border-collapse text-[#CACCCC] text-[0.8rem] text-start">
                            <thead className="bg-[#051E1C] text-left sticky top-0 z-20 text-[#68BFB6]">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">Fault Code</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Categories</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Description</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Severity</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[#030F0E] capitalize font-light" id="alert-container">
                                {Array.isArray(notifications) ? (
                                    notifications.map((item, index) => (
                                        <tr key={index}>
                                            <td className='px-4 py-3'>{item.fault_code}</td>
                                            <td className='px-4 py-3'>{item.category}</td>
                                            <td className='px-4 py-3'>{item.description}</td>
                                            <td className={`px-4 py-3 whitespace-nowrap ${item.severity.toLowerCase() === 'alert' ? 'severity-alert' : item.severity.toLowerCase() === 'shutdown' ? 'severity-shutdown' : ''}`}>
                                                {item.severity}
                                            </td>
                                            <td className='px-4 py-3' style={{ color: item.status.toLowerCase() === 'open' ? '#EB5757' : '#57EB66' }}>
                                                {item.status}
                                            </td>
                                            <td className='px-4 py-3'>{item.date_time}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className='px-4 py-3 text-center'>No notifications available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                    </div>
                </div>
            </div>

        </div>
    )
}


export default Alert;