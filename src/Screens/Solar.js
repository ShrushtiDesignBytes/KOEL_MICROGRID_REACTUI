/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/heading-has-content */
/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Solar = ({BaseUrl, Url}) => {
    const [data, setData] = useState({})
    const [alertsData, setAlertsData] = useState([]);
    const [alertCount, setAlertCount] = useState(0);
    const [shutdownCount, setShutdownCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const containerRef = useRef(null);

    const fetchAlerts = async () => {
        try {
            const response = await fetch(`${BaseUrl}/solar`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            const sortedData = data.sort((a, b) => a.id - b.id);
            console.log(sortedData)
            setData(sortedData[sortedData.length - 1]);
            setLoading(false);
        } catch (error) {
            console.error('Fetch Error:', error);
            setLoading(false);
        }
        try {
            const response = await fetch(`${BaseUrl}/alert`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setAlertsData(data);
            displayCounts(data);

        } catch (error) {
            console.error('Fetch Error:', error);
        }
    };

    const updateData = async (newData) => {
        try {
            const response = await fetch(`${Url}/solar/1`, {
                method: 'PATCH', 
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
        // Fetch API data   
        fetchAlerts();

        updateData(data)
        
        const interval = setInterval(fetchAlerts, 1000);

        return () => clearInterval(interval);
      }, [data]);

    
      // Use another useEffect to handle image onload after rendering
      useEffect(() => {
        if (imageLoaded && !loading) {
            fetch('./dummy_data.json')
                .then((response) => response.json())
                .then((data) => {
                    const filteredData = data.graph.filter((d) => d.hour >= 8 && d.hour <= 16);
                    displayDataCurveGraph(filteredData);
                })
                .catch((error) => {
                    console.error('Error fetching dummy data:', error);
                });
        }
    }, [imageLoaded, loading]); // Trigger when image is loaded

    const handleImageLoad = () => {
        setImageLoaded(true); // Set image loaded to true when the image loads
    };

    const handleImageError = () => {
        console.error('Image failed to load'); // Handle image load error
    };
   

    const displayCounts = (data) => {
        const solarData = data.filter((i) => i.category === 'solar');
        const alerts = solarData.filter((i) => i.severity.toLowerCase() === 'alert');
        const shutdown = solarData.filter((i) => i.severity.toLowerCase() === 'shutdown');
        setAlertCount(alerts.length);
        setShutdownCount(shutdown.length);
    };

    const displayDataCurveGraph = (data) => {
        const margin = { top: 10, right: 10, bottom: 70, left: 20 };

        function updateDimensions() {
            // const container = document.getElementById('grid-it-rl');
            // const width = container.offsetWidth - margin.left - margin.right - 60;
            // const height = container.offsetHeight - margin.top - margin.bottom - 70;

            if (!containerRef.current) return; // Ensure the container exists

            const container = containerRef.current;
            const width = container.offsetWidth - margin.left - margin.right - 60;
            const height = container.offsetHeight - margin.top - margin.bottom - 70;

            svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

            x.range([0, width]);
            y.range([height, 0]);

            svg.select('.x-axis')
                .attr('transform', `translate(0, ${height})`)
                .call(d3.axisBottom(x).ticks(9).tickSizeOuter(0).tickFormat((d) => formatAMPM(d)))
                .selectAll('text')
                .style('fill', 'white');

            svg.select('.y-axis')
                .call(d3.axisLeft(y).ticks(5).tickSize(4).tickFormat((d) => ''))
                .selectAll('text')
                .style('fill', 'white');

            svg.select('.curve').attr('d', d3.line().x((d) => x(d.hour)).y((d) => y(+d.power)).curve(d3.curveBasis));

            svg.select('.shadow').attr('d', d3.area().x((d) => x(d.hour)).y0(height).y1((d) => y(+d.power)).curve(d3.curveBasis));
        }

        const svg = d3.select('#my_dataviz').append('svg').attr('width', '100%').attr('height', '100%').append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([8, 16]).range([0, 0]);
        const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d.power)]).nice().range([0, 0]);

        svg.append('g').attr('class', 'x-axis');
        svg.append('g').attr('class', 'y-axis');

        svg.append('path').datum(data).attr('class', 'curve').attr('fill', 'none').attr('stroke', '#68BFB6').attr('stroke-width', 2);

        const gradient = svg.append('defs').append('linearGradient').attr('id', 'shadowGradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');

        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#0A3D38').attr('stop-opacity', 0.9);
        gradient.append('stop').attr('offset', '80%').attr('stop-color', '#0A3D38').attr('stop-opacity', 0);

        svg.append('path').datum(data).attr('class', 'shadow').attr('fill', 'url(#shadowGradient)').attr('stroke-width', 0);

        const tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

        svg.selectAll('.curve, .shadow')
            .on('mouseover', function (event, d) {
                const bisect = d3.bisector((d) => d.hour).right;
                const i = bisect(data, x.invert(d3.pointer(event)[0]));
                const d0 = data[i - 1];
                const d1 = data[i];
                const dHover = x.invert(d3.pointer(event)[0]) - d0.hour > d1.hour - x.invert(d3.pointer(event)[0]) ? d1 : d0;
                tooltip.transition().duration(200).style('opacity', 0.9);
                tooltip.html(`Hour: ${formatAMPM(dHover.hour)}, Power: ${dHover.power}`).style('left', event.pageX + 'px').style('top', event.pageY - 28 + 'px');
            })
            .on('mouseout', function () {
                tooltip.transition().duration(500).style('opacity', 0);
            });

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
        };
    };

    const formatAMPM = (hour) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour} ${ampm}`;
    };

    return (
        !loading && <div className="p-4">
            <div className="grid grid-cols-2 gap-5">
                <div className="relative block">
                    <img id="overview-image" src="assets/Mask group.svg" alt="overview"  onLoad={handleImageLoad}
                        onError={handleImageError}
                        className="block w-full h-full object-cover rounded-md" />

                    <div className="absolute bottom-[7%] left-[5%] transform translate-x-[-20%] translate-y-[20%] 
            p-2 bg-transparent text-white rounded-md z-10 flex items-center max-w-[calc(100%-40px)]">
                        <div className="flex items-center">
                            <div className="mr-2">
                                <img src="assets/Icons (T).png" className="h-10 max-h-1/2 max-w-full" alt='image' />
                            </div>
                            <div>
                                <p className="text-xs text-[#959999] pb-1 m-0">Total Capacity</p>
                                <p className="text-sm m-0">550 kWh</p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-[7%] left-[35%] transform translate-x-[-20%] translate-y-[20%] 
            p-2 bg-transparent text-white rounded-md z-10 flex items-center max-w-[calc(100%-40px)]">
                        <div className="flex items-center">
                            <div className="mr-2">
                                <img src="assets/Icons-Status.png" className="h-10 max-h-1/2 max-w-full" alt='image' />
                            </div>
                            <div>
                                <p className="text-xs text-[#959999] pb-1 m-0">Status</p>
                                <p className="text-sm m-0">Active</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-rows-[25%_70%] gap-4 flex-1">
                    <div className="grid grid-cols-4 gap-2 mt-1">
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Operating Hours</p>
                            <p className="text-lg font-semibold text-[#F3E5DE] pt-2" id="operating-hours">{data.operating_hours} hrs</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Generation</p>
                            <p className="text-lg font-semibold text-[#F3E5DE] pt-2" id="total-generation">{data.total_generation} kWh</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Utilisation</p>
                            <p className="text-lg font-semibold text-[#F3E5DE] pt-2" id="total-utilisation">{data.total_utilisation} kWh</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Savings</p>
                            <p className="text-lg font-semibold text-[#F3E5DE] pt-2" id="total-savings">INR {data.total_saving}</p>
                        </div>
                    </div>

                    <div className="rounded-lg mt-2 p-4" id="grid-it-rl" ref={containerRef}>
                        <div className="flex justify-between mb-4">
                            <h5 className="text-sm text-white">Energy Generated Today</h5>
                            <p className="text-white text-xs font-normal">Total Daily Generation: {data.daily_generation} kWh</p>
                        </div>
                        <p className="text-[#AFB2B2] text-xs mt-3 ">Updated 15 min ago</p>
                        <div className="mt-4">
                            <div id="my_dataviz" className="h-[200px]"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-5 mt-2">
                <div className="grid-item-left">
                    <div className="grid grid-cols-4 gap-2 mt-1">
                        {/* Power Generated Yesterday */}
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <img src="assets/Icons.svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="power-generated" alt='image'>{data.power_generated}</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Power Generated Yesterday</p>
                            </div>
                            {/* Hours Operated Yesterday */}
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <img src="assets/Icons (5).svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="hours" alt='image'>{data.hours_operated}</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Hours Operated Yesterday</p>
                            </div>
                        </div>

                        {/* Utilization Factor */}
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (2).svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="utilisation" alt='image'>{data.utilisation}%</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Utilization Factor</p>
                            </div>
                            {/* Power Factor */}
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (6).svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="power" alt='image'>{data.power_factor}</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Power Factor</p>
                            </div>
                        </div>

                        {/* Frequency and Breaker Status */}
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (3).svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="frequency" alt='image'>{data.frequency}</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Frequency (Hz)</p>
                            </div>
                            {/* Breaker Status */}
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (4).svg" alt="icon" />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="breakerstatus" alt='image'>{data.breaker_status}</h6>
                                </div>
                                <p className="text-[14px] text-[#AFB2B2] text-start">Breaker Status</p>
                            </div>
                        </div>

                        {/* Maintenance */}
                        <div className="grid grid-cols-1 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 py-4 flex flex-col justify-between">
                                <p className="text-sm xl:text-base text-white">Maintenance</p>
                                <div className="m-0 p-0">
                                    <p className="text-[#7A7F7F] text-[14px] m-0">Last date:</p>
                                    <p className="text-[16px] text-white pt-1 m-0" id="maintenance-last-date">{data.maintainance_last_date}</p>
                                </div>
                                <div className="m-0 p-0">
                                    <p className="text-[#7A7F7F] text-[14px] m-0">Next Due:</p>
                                    <p className="text-[16px] text-white pt-1 m-0" id="next-due">{data.next_due}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Voltage and Current Table */}
                    <div className="grid mt-2 rounded-md">
                        <div className="grid-item-left-down mt-2 bg-[#030F0E] mb-7 rounded-md">
                            <table className="table-style w-full border-collapse">
                                <thead className="bg-[#051E1C] text-[#68BFB6]">
                                    <tr className="text-xs font-medium">
                                        <th className="whitespace-nowrap text-center p-5 rounded-tl-lg"></th> {/* Top-left radius */}
                                        <th className="text-center font-medium">Voltage (L-L)(V)</th>
                                        <th className="text-center font-medium">Voltage (L-N)(V)</th>
                                        <th className="text-center rounded-tr-lg font-medium">Current (Amp)</th> {/* Top-right radius */}
                                    </tr>
                                </thead>
                                <tbody className="bg-[#030F0E] text-[#CACCCC]">
                                    <tr>
                                        <td className="text-center p-4 rounded-l-lg text-sm">L1 Phase</td> {/* Left-side rounded */}
                                        <td id="voltage-l-l-phase1" className="text-center p-4 text-sm">{data.voltagel.phase1}</td>
                                        <td id="voltage-l-n-phase1" className="text-center p-4 text-sm">{data.voltagen.phase1}</td>
                                        <td id="current-phase1" className="text-center p-4 text-sm">{data.current.phase1}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center p-4 rounded-l-lg text-sm">L2 Phase</td> {/* Left-side rounded */}
                                        <td id="voltage-l-l-phase2" className="text-center p-4 text-sm">{data.voltagel.phase2}</td>
                                        <td id="voltage-l-n-phase2" className="text-center p-4 text-sm">{data.voltagen.phase2}</td>
                                        <td id="current-phase2" className="text-center p-4 text-sm">{data.current.phase2}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center p-4 rounded-bl-lg text-sm">L3 Phase</td> {/* Bottom-left radius */}
                                        <td id="voltage-l-l-phase3" className="text-center p-4 text-sm">{data.voltagel.phase3}</td>
                                        <td id="voltage-l-n-phase3" className="text-center p-4 text-sm">{data.voltagen.phase3}</td>
                                        <td id="current-phase3" className="text-center p-4 rounded-br-lg text-sm">{data.current.phase3}</td>
                                    </tr>
                                </tbody>
                            </table>

                        </div>
                    </div>
                </div>

                <div className="grid-item-right">
                    <div className="grid-item-right-left">
                        <div className="grid-item-left-down mt-2">
                            <div className="notification-style p-2 rounded-md bg-[#030F0E]">
                                <div className="text-white text-[20px] flex justify-between items-start">
                                    <div className="mb-3 text-[16px] font-bold">
                                        Notifications
                                    </div>
                                    <div className="flex">
                                        <p className="flex items-center ml-4 text-[#AFB2B2] text-[14px]">
                                            Alert
                                            <svg className="ml-2" width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="10.5" cy="11" r="10.5" fill="#41ACA1" />
                                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontFamily="Arial" id="alertlen">
                                                    {alertCount}
                                                </text>
                                            </svg>
                                        </p>

                                        <p className="flex items-center ml-4 text-[#AFB2B2] text-[14px]">
                                            Shutdown
                                            <svg className="ml-2" width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="10.5" cy="11" r="10.5" fill="#EB5757" />
                                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontFamily="Arial" id="shutdownlen">
                                                    {shutdownCount}
                                                </text>
                                            </svg>
                                        </p>
                                    </div>
                                </div>

                            </div>
                            <div className="bg-[#030F0E] rounded-lg pb-2.5 overflow-y-auto max-h-[200px]"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#0A3D38 #0F544C',
                                }}>
                                <table className="w-full border-collapse text-[#CACCCC] text-[0.8rem]">
                                    <thead className="bg-[#051E1C] text-left sticky top-0 z-20 text-[#68BFB6]">
                                        <tr className="text-xs">
                                            <th className="px-3 py-3 rounded-tl-lg font-medium">Fault Code</th>
                                            {/* <th>Categories</th> */}
                                            <th className="px-3 py-2 font-medium">Description</th>
                                            <th className="px-3 py-2 font-medium">Severity</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                            <th className="px-3 py-2 rounded-tr-lg font-medium">Date/Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[#030F0E] capitalize text-[#CACCCC]" id="alert-container">
                                        {alertsData.filter(i => i.category === 'solar').map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2">{item.fault_code}</td>
                                                <td className="px-3 py-2">{item.description}</td>
                                                <td className={`px-3 py-3 whitespace-nowrap ${item.severity.toLowerCase() === 'alert' ? 'severity-alert' : item.severity.toLowerCase() === 'shutdown' ? 'severity-shutdown' : ''}`}>
                                                    {item.severity}
                                                </td>
                                                <td className='px-3 py-3' style={{ color: item.status.toLowerCase() === 'open' ? '#EB5757' : '#57EB66' }}>
                                                    {item.status}
                                                </td>
                                                <td className="px-3 py-2">{item.date_time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                        <div className="grid-item-left-down mt-5 bg-[#030F0E] mb-7 rounded-lg pb-0">
                            <table className="table-style w-full border-collapse">
                                <thead className="thead-style bg-[#051E1C] text-[#68BFB6]">
                                    <tr className="text-xs text-center font-medium">
                                        <th className="whitespace-nowrap p-3 rounded-tl-lg font-medium">Power</th>
                                        <th className="p-3 font-medium">Phase 1</th>
                                        <th className="p-3 font-medium">Phase 2</th>
                                        <th className="p-3 rounded-tr-lg font-medium">Phase 3</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#030F0E] text-center text-[#CACCCC]">
                                    <tr className='text-sm'>
                                        <td className="p-3">kW</td>
                                        <td id="kW-phase1" className="p-2">{data.kW.phase1}</td>
                                        <td id="kW-phase2" className="p-2">{data.kW.phase2}</td>
                                        <td id="kW-phase3" className="p-2">{data.kW.phase3}</td>
                                    </tr>
                                    <tr className='text-sm'>
                                        <td className="p-3 rounded-bl-lg">kVA</td>
                                        <td id="kVA-phase1" className="p-2">{data.kVA.phase1}</td>
                                        <td id="kVA-phase2" className="p-2">{data.kVA.phase2}</td>
                                        <td id="kVA-phase3" className="p-2 rounded-br-lg">{data.kVA.phase3}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>


        </div>
    )
}


export default Solar;