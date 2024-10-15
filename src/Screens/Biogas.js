/* eslint-disable jsx-a11y/heading-has-content */
/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Biogas = ({BaseUrl, Url}) => {
    const [data, setData] = useState({})
    const [alertsData, setAlertsData] = useState([]);
    const [alertCount, setAlertCount] = useState(0);
    const [shutdownCount, setShutdownCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const containerRef = useRef(null)

    const fetchAlerts = async () => {
        try {
            const response = await fetch(`${BaseUrl}/biogas`);
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
            const response = await fetch(`${Url}/biogas/1`, {
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
        const biogasData = data.filter((i) => i.category === 'biogas');
        const alerts = biogasData.filter((i) => i.severity.toLowerCase() === 'alert');
        const shutdown = biogasData.filter((i) => i.severity.toLowerCase() === 'shutdown');
        setAlertCount(alerts.length);
        setShutdownCount(shutdown.length);
    };

    const displayDataCurveGraph = (data) => {
        const margin = { top: 10, right: 10, bottom: 60, left: 20 };

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
                .style('fill', 'white').style('font-size', width > 1500 ? '14px' : '12px');;

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
                <div className="relative">
                    <img id="overview-image" src="assets/image.svg" width="100%" alt="overview" onLoad={handleImageLoad}
                        onError={handleImageError} className="block w-full h-full object-cover rounded-md" />

                    <div className="absolute bottom-7 left-5 flex items-center max-w-[calc(100%-40px)] text-white">
                        <img src="assets/Icons (T).png" alt="total capacity" className="h-10 max-h-[50%] max-w-full mr-3" />
                        <div>
                            <p className="text-xs xl:text-sm text-[#959999] mb-1">Total Capacity</p>
                            <p className="text-sm xl:text-base">550 kWh</p>
                        </div>
                    </div>

                    <div className="absolute bottom-7 left-[35%] flex items-center max-w-[calc(100%-40px)] text-white">
                        <img src="assets/Icons-Status.png" alt="status" className="h-10 max-h-[50%] max-w-full mr-3" />
                        <div>
                            <p className="text-xs xl:text-sm text-[#959999] mb-1">Status</p>
                            <p className="text-sm xl:text-base">Active</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-rows-[25%_70%] gap-4">
                    <div className="grid grid-cols-4 gap-2 mt-1">
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Operating Hours</p>
                            <p className="text-lg xl:text-xl font-semibold text-[#F3E5DE] pt-2" id="operating-hours">{data.operating_hours} hrs</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Generation</p>
                            <p className="text-lg xl:text-xl font-semibold text-[#F3E5DE] pt-2" id="total-generation">{data.total_generation} kWh</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Utilisation</p>
                            <p className="text-lg xl:text-xl font-semibold text-[#F3E5DE] pt-2" id="total-utilisation">{data.total_utilisation} kWh</p>
                        </div>
                        <div className="bg-[#051E1C] rounded-lg flex flex-col items-center justify-center">
                            <p className="text-xs xl:text-sm text-[#C37C5A] font-medium text-center">Total Savings</p>
                            <p className="text-lg xl:text-xl font-semibold text-[#F3E5DE] pt-2" id="total-savings">INR {data.total_saving}</p>
                        </div>
                    </div>

                    <div id="grid-it-rl" className="rounded-lg mt-2 p-4" ref={containerRef}>
                        <div className="flex justify-between mb-4">
                            <p className="text-sm xl:text-base text-white">Energy Generated Today</p>
                            <p className="text-xs xl:text-sm text-white">Total Daily Generation: {data.daily_generation} kWh</p>
                        </div>
                        <p className="text-xs xl:text-sm text-[#AFB2B2] mt-2 text-start">Updated 15 min ago</p>
                        <div className="mt-4 h-[210px] xl:h-[300px]" id="my_dataviz"></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-5 mt-2 ">
                <div className="grid-item-left">
                    <div className="grid grid-cols-4 gap-2 mt-1">
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 gap-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <img src="assets/Icons.svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="power-generated">{data.power_generated}</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Power Generated Yesterday</p>
                            </div>
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 gap-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <img src="assets/Icons (5).svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="hours">{data.hours_operated}</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Hours operated Yesterday</p>
                            </div>
                        </div>
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (2).svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="utilisation">{data.utilisation}%</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Utilisation Factor</p>
                            </div>
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (6).svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="power">{data.power_factor}</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Power Factor</p>
                            </div>
                        </div>
                        <div className="grid grid-rows-2 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (3).svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="frequency">{data.frequency}</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Frequency (Hz)</p>
                            </div>
                            <div className="bg-[#051e1c] rounded-md mb-2 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <img src="assets/Icons (4).svg" alt='image' />
                                    <h6 className="text-[#F3E5DE] text-sm xl:text-base font-semibold" id="breakerstatus">{data.breaker_status}</h6>
                                </div>
                                <p className="text-sm xl:text-base text-[#AFB2B2] text-start">Breaker Status</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 mt-2">
                            <div className="bg-[#051e1c] rounded-md mb-2 py-4 p-2 flex flex-col justify-between">
                                <p className=" text-sm xl:text-base text-white">Maintenance</p>
                                <div className="py-0 m-0">
                                    <p className="text-[#7A7F7F] text-sm xl:text-base py-0 m-0">Last date:</p>
                                    <p className="text-base xl:text-lg text-white pt-1 m-0" id="maintenance-last-date">{data.maintainance_last_date}</p>
                                </div>
                                <div className="py-0 m-0">
                                    <p className="text-[#7A7F7F] text-sm xl:text-base py-0 m-0">Next Due:</p>
                                    <p className="text-base xl:text-lg text-white pt-1 m-0" id="next-due">{data.next_due}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid mt-2 rounded-md">
                        <div className="grid-item-left-down mt-2 bg-[#030F0E] mb-7 rounded-md">
                            <table className="table-style w-full border-collapse">
                                <thead className="bg-[#051E1C] text-[#68BFB6]">
                                    <tr className="text-xs xl:text-sm font-medium">
                                        <th className="text-center p-5 xl:p-6 rounded-tl-lg"></th> {/* Top-left radius */}
                                        <th className="text-center font-medium">Voltage (L-L)(V)</th>
                                        <th className="text-center font-medium">Voltage (L-N)(V)</th>
                                        <th className="text-center rounded-tr-lg font-medium">Current (Amp)</th> {/* Top-right radius */}
                                    </tr>
                                </thead>
                                <tbody className="bg-[#030F0E] text-[#CACCCC]">
                                    <tr>
                                        <td className="text-center p-4 rounded-l-lg text-sm xl:text-base">L1 Phase</td> {/* Left-side rounded */}
                                        <td id="voltage-l-l-phase1" className="text-center p-4 text-sm xl:text-base">{data.voltagel.phase1}</td>
                                        <td id="voltage-l-n-phase1" className="text-center p-4 text-sm xl:text-base">{data.voltagen.phase1}</td>
                                        <td id="current-phase1" className="text-center p-4 text-sm xl:text-base">{data.current.phase1}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center p-4 rounded-l-lg text-sm xl:text-base">L2 Phase</td> {/* Left-side rounded */}
                                        <td id="voltage-l-l-phase2" className="text-center p-4 text-sm xl:text-base">{data.voltagel.phase2}</td>
                                        <td id="voltage-l-n-phase2" className="text-center p-4 text-sm xl:text-base">{data.voltagen.phase2}</td>
                                        <td id="current-phase2" className="text-center p-4 text-sm xl:text-base">{data.current.phase2}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center p-4 rounded-bl-lg text-sm xl:text-base">L3 Phase</td> {/* Bottom-left radius */}
                                        <td id="voltage-l-l-phase3" className="text-center p-4 text-sm xl:text-base">{data.voltagel.phase3}</td>
                                        <td id="voltage-l-n-phase3" className="text-center p-4 text-sm xl:text-base">{data.voltagen.phase3}</td>
                                        <td id="current-phase3" className="text-center p-4 rounded-br-lg text-sm xl:text-base">{data.current.phase3}</td>
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
                                    <div className="mb-4 text-base xl:text-lg font-bold">
                                        Notifications
                                    </div>
                                    <div className="flex">
                                        <p className="flex items-center ml-4 text-[#AFB2B2] text-sm xl:text-base">
                                            Alert
                                            <svg className="ml-2" width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="10.5" cy="11" r="10.5" fill="#41ACA1" />
                                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontFamily="Arial" id="alertlen">
                                                    {alertCount}
                                                </text>
                                            </svg>
                                        </p>

                                        <p className="flex items-center ml-4 text-[#AFB2B2] text-sm xl:text-base">
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
                                        <tr className="text-xs xl:text-sm">
                                            <th className="px-3 xl:px-4 py-2 xl:py-3 rounded-tl-lg font-medium">Fault Code</th>
                                            <th className="px-3 py-2 font-medium">Description</th>
                                            <th className="px-3 py-2 font-medium">Severity</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                            <th className="px-3 py-2 rounded-tr-lg font-medium">Date/Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[#030F0E] capitalize text-[#CACCCC]" id="alert-container">
                                        {alertsData.filter(i => i.category === 'biogas').map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-3 xl:px-4 py-2 xl:py-3">{item.fault_code}</td>
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
                        <div className="grid-item-left-down mt-6 bg-[#030F0E] mb-3 rounded-lg pb-0">
                            <table className="table-style w-full border-collapse">
                                <thead className="thead-style bg-[#051E1C] text-[#68BFB6]">
                                    <tr className="text-xs xl:text-sm text-center font-medium">
                                        <th className="whitespace-nowrap p-3 rounded-tl-lg font-medium">Power</th>
                                        <th className="p-2 font-medium">Phase 1</th>
                                        <th className="p-2 font-medium">Phase 2</th>
                                        <th className="p-2 rounded-tr-lg font-medium">Phase 3</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#030F0E] text-center text-[#CACCCC]">
                                    <tr className='text-sm xl:text-base'>
                                        <td className="p-3">kW</td>
                                        <td id="kW-phase1" className="p-2">{data.kW.phase1}</td>
                                        <td id="kW-phase2" className="p-2">{data.kW.phase2}</td>
                                        <td id="kW-phase3" className="p-2">{data.kW.phase3}</td>
                                    </tr>
                                    <tr className='text-sm xl:text-base'>
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


export default Biogas;