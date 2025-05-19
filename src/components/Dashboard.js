import React from "react";
import LotteryList from "./LotteryList";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-4xl font-bold text-black mb-8 text-center">
          Добро пожаловать в лотерею!
        </h1>
        <LotteryList />
      </div>
    </div>
  );
};

export default Dashboard;