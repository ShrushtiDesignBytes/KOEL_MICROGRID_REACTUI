import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 w-14 h-full bg-[#030F0E] pt-2 transition-width duration-300">
      <ul className="flex flex-col items-center space-y-6">
        <li className="my-3">
          <Link to="/">
            <img src="./assets/Logo_N.png" alt="Dashboard" className="w-4 h-6" />
          </Link>
        </li>
        <li className="mt-2">
              <Link to="#">
                <img src="./assets/Pie_Chart.png" alt="Pie Chart" className="w-5 h-5" />
              </Link>
            </li>
            <li className="mt-4">
              <Link to="#">
                <img src="./assets/Download.png" alt="Download" className="w-5 h-5" />
              </Link>
            </li>
            <li className="mt-4">
              <Link to="#">
                <img src="./assets/Activity.png" alt="Download" className="w-5 h-5" />
              </Link>
            </li>
            <li className="mt-4">
              <Link to="#">
                <img src="./assets/Image.png" alt="Download" className="w-5 h-5" />
              </Link>
            </li>
            <li className="mt-4">
              <Link to="#">
                <img src="./assets/Calendar.png" alt="Download" className="w-5 h-5" />
              </Link>
            </li>
            <li className="mt-4">
              <Link to="#">
                <img src="./assets/Fire.png" alt="Download" className="w-6 h-6" />
              </Link>
            </li>
      </ul>
    </div>
  );
};

export default Sidebar;
