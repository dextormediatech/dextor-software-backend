import mongoose from "mongoose";
import Receipt from "../models/receipts.model.js";
import Invoice from "../models/invoices.model.js";

/**
 * 1. Revenue Report (Based on payment-receipt)
 * - Total revenue
 * - Monthly, quarterly, and yearly revenue
 * - Revenue growth percentage (Month-over-month)
 * - Revenue by service
 * - Revenue by client
 */
export const getRevenueReport = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. Total All-time Revenue
    const totalRevAgg = await Receipt.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paymentAmount" },
          totalCount: { $sum: 1 },
        },
      },
    ]);
    const totalRevenue = totalRevAgg[0]?.totalRevenue || 0;
    const totalReceipts = totalRevAgg[0]?.totalCount || 0;

    // 2. Monthly Revenue for current year & previous month (for growth calculation)
    const monthlyAgg = await Receipt.aggregate([
      {
        $project: {
          year: { $year: "$paymentDate" },
          month: { $month: "$paymentDate" },
          paymentAmount: 1,
        },
      },
      {
        $match: {
          year: currentYear,
        },
      },
      {
        $group: {
          _id: "$month",
          revenue: { $sum: "$paymentAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const found = monthlyAgg.find((m) => m._id === monthNum);
      return {
        month: monthNames[i],
        monthIndex: monthNum,
        revenue: found ? found.revenue : 0,
        receiptsCount: found ? found.count : 0,
      };
    });

    // 3. Quarterly Revenue for current year
    const quarterlyAgg = await Receipt.aggregate([
      {
        $project: {
          year: { $year: "$paymentDate" },
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: "$paymentDate" }, 3] }, then: "Q1" },
                { case: { $lte: [{ $month: "$paymentDate" }, 6] }, then: "Q2" },
                { case: { $lte: [{ $month: "$paymentDate" }, 9] }, then: "Q3" },
              ],
              default: "Q4",
            },
          },
          paymentAmount: 1,
        },
      },
      {
        $match: {
          year: currentYear,
        },
      },
      {
        $group: {
          _id: "$quarter",
          revenue: { $sum: "$paymentAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const quarterMap = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    quarterlyAgg.forEach((q) => {
      quarterMap[q._id] = q.revenue;
    });
    const quarterlyRevenue = [
      { quarter: "Q1", label: "Jan - Mar", revenue: quarterMap.Q1 },
      { quarter: "Q2", label: "Apr - Jun", revenue: quarterMap.Q2 },
      { quarter: "Q3", label: "Jul - Sep", revenue: quarterMap.Q3 },
      { quarter: "Q4", label: "Oct - Dec", revenue: quarterMap.Q4 },
    ];

    // 4. Yearly Revenue (Last 5 years)
    const yearlyAgg = await Receipt.aggregate([
      {
        $project: {
          year: { $year: "$paymentDate" },
          paymentAmount: 1,
        },
      },
      {
        $group: {
          _id: "$year",
          revenue: { $sum: "$paymentAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const yearlyRevenue = yearlyAgg.map((y) => ({
      year: y._id,
      revenue: y.revenue,
      count: y.count,
    }));

    // 5. Month-over-Month Revenue Growth Percentage
    // Compare current month with previous month (could be Dec of last year if Jan)
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;

    const currentMonthRevenue =
      monthlyRevenue.find((m) => m.monthIndex === currentMonth)?.revenue || 0;

    let prevMonthRevenue = 0;
    if (prevYear === currentYear) {
      prevMonthRevenue =
        monthlyRevenue.find((m) => m.monthIndex === prevMonth)?.revenue || 0;
    } else {
      const prevAgg = await Receipt.aggregate([
        {
          $match: {
            paymentDate: {
              $gte: new Date(prevYear, prevMonth - 1, 1),
              $lt: new Date(prevYear, prevMonth, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$paymentAmount" },
          },
        },
      ]);
      prevMonthRevenue = prevAgg[0]?.revenue || 0;
    }

    let growthPercentage = 0;
    if (prevMonthRevenue > 0) {
      growthPercentage = Number(
        (((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1)
      );
    } else if (currentMonthRevenue > 0) {
      growthPercentage = 100;
    }

    // 6. Revenue by Client
    const clientAgg = await Receipt.aggregate([
      {
        $group: {
          _id: "$clientDetails.organizationName",
          organizationName: { $first: "$clientDetails.organizationName" },
          clientName: { $first: "$clientDetails.clientName" },
          clientId: { $first: "$clientId" },
          totalRevenue: { $sum: "$paymentAmount" },
          receiptsCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const revenueByClient = clientAgg.map((c) => ({
      organizationName: c.organizationName || "Unknown Client",
      clientName: c.clientName || "",
      clientId: c.clientId,
      revenue: c.totalRevenue,
      receiptsCount: c.receiptsCount,
      percentage: totalRevenue > 0 ? Number(((c.totalRevenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // 7. Revenue by Service (Digital Marketing vs Software Development)
    // Join Receipt -> Invoice -> Quotation -> Service, and Receipt -> Client
    const serviceAgg = await Receipt.aggregate([
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "quotations",
          localField: "invoice.quotationId",
          foreignField: "_id",
          as: "quotation",
        },
      },
      {
        $unwind: {
          path: "$quotation",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "quotation.serviceId",
          foreignField: "_id",
          as: "serviceDoc",
        },
      },
      {
        $unwind: {
          path: "$serviceDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientDoc",
        },
      },
      {
        $unwind: {
          path: "$clientDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          paymentAmount: 1,
          notes: 1,
          invoiceTitle: "$invoice.title",
          invoiceItems: "$invoice.items",
          quotationNumber: {
            $ifNull: ["$invoice.quotationNumber", "$quotation.quotationNumber"],
          },
          quotationService: "$quotation.serviceName",
          serviceDepartment: "$serviceDoc.department",
          serviceDocName: "$serviceDoc.name",
          clientService: "$clientDoc.clientService",
        },
      },
    ]);

    const classifyService = (r) => {
      // Priority 1: Explicit quotation service / department / quotationNumber prefix
      const primaryHints = [
        r.serviceDepartment,
        r.serviceDocName,
        r.quotationService,
        r.clientService,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const secondaryHints = [
        r.invoiceTitle,
        ...(Array.isArray(r.invoiceItems) ? r.invoiceItems.map((i) => i.title) : []),
        r.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const qNum = String(r.quotationNumber || "").toUpperCase();
      const combined = `${primaryHints} ${secondaryHints}`;

      const isSoftware =
        qNum.startsWith("SD-") ||
        /\b(software|development|web|website|app|mobile|erp|crm|portal|api|system|saas|coding)\b/.test(
          primaryHints || combined
        );

      const isMarketing =
        qNum.startsWith("DM-") ||
        /\b(social|media|marketing|smm|seo|ads|meta|instagram|facebook|branding|content|reel|video|graphic|digital)\b/.test(
          primaryHints || combined
        );

      if (isSoftware && !isMarketing) return "Software Development";
      if (isMarketing && !isSoftware) return "Digital Marketing";

      // If primary hints lean clearly to one
      if (
        /\b(software|development|web|app|erp|crm)\b/.test(primaryHints)
      ) {
        return "Software Development";
      }
      if (
        /\b(social|media|marketing|smm|seo|digital)\b/.test(primaryHints)
      ) {
        return "Digital Marketing";
      }

      if (isSoftware) return "Software Development";
      if (isMarketing) return "Digital Marketing";
      return "Other Services";
    };

    const serviceRevenueMap = {
      "Digital Marketing": 0,
      "Software Development": 0,
    };

    for (const receipt of serviceAgg) {
      const receiptAmt = Number(receipt.paymentAmount) || 0;
      const category = classifyService(receipt);
      serviceRevenueMap[category] = (serviceRevenueMap[category] || 0) + receiptAmt;
    }

    const revenueByService = Object.keys(serviceRevenueMap)
      .filter((k) => k !== "Other Services" || serviceRevenueMap[k] > 0)
      .map((serviceName) => {
        const rev = Math.round(serviceRevenueMap[serviceName]);
        return {
          serviceName,
          revenue: rev,
          percentage: totalRevenue > 0 ? Number(((rev / totalRevenue) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalReceipts,
          currentMonthRevenue,
          prevMonthRevenue,
          growthPercentage,
          currentYear,
        },
        monthlyRevenue,
        quarterlyRevenue,
        yearlyRevenue,
        revenueByClient,
        revenueByService,
      },
    });
  } catch (error) {
    console.error("Error generating revenue report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate revenue report",
      error: error.message,
    });
  }
};

/**
 * 2. Outstanding Payments Report (Based on Invoices)
 * - Total pending payments
 * - Overdue invoices
 * - Partially paid invoices
 * - Client-wise outstanding amounts
 * - Payment aging (0–30, 31–60, 61–90, 90+ days)
 */
export const getOutstandingReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all invoices that have balanceAmount > 0 (or status !== 'Paid')
    const invoices = await Invoice.find({
      balanceAmount: { $gt: 0 },
    }).sort({ dueDate: 1 });

    let totalPendingPayments = 0;
    const overdueInvoices = [];
    const partiallyPaidInvoices = [];
    const clientOutstandingMap = {};

    const agingBuckets = {
      currentOr0to30: { label: "0–30 Days", min: 0, max: 30, amount: 0, count: 0, invoices: [] },
      days31to60: { label: "31–60 Days", min: 31, max: 60, amount: 0, count: 0, invoices: [] },
      days61to90: { label: "61–90 Days", min: 61, max: 90, amount: 0, count: 0, invoices: [] },
      days90Plus: { label: "90+ Days", min: 91, max: Infinity, amount: 0, count: 0, invoices: [] },
    };

    for (const inv of invoices) {
      const balance = Number(inv.balanceAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const total = Number(inv.totalAmount) || 0;
      totalPendingPayments += balance;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdue = dueDate < today;
      const diffTime = today.getTime() - dueDate.getTime();
      const overdueDays = isOverdue ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;

      const invoiceItem = {
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        title: inv.title,
        clientDetails: inv.clientDetails,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        dueDate: inv.dueDate,
        status: inv.status,
        overdueDays,
        isOverdue,
      };

      // Overdue invoices check
      if (isOverdue) {
        overdueInvoices.push(invoiceItem);
      }

      // Partially paid invoices check
      if (paid > 0 && balance > 0) {
        partiallyPaidInvoices.push(invoiceItem);
      }

      // Client-wise aggregation
      const orgName = inv.clientDetails?.organizationName?.trim() || "Unknown Client";
      if (!clientOutstandingMap[orgName]) {
        clientOutstandingMap[orgName] = {
          organizationName: orgName,
          clientName: inv.clientDetails?.clientName || "",
          clientPhone: inv.clientDetails?.clientPhone || "",
          clientEmail: inv.clientDetails?.clientEmail || "",
          clientId: inv.clientId,
          totalOutstanding: 0,
          invoicesCount: 0,
          overdueCount: 0,
        };
      }
      clientOutstandingMap[orgName].totalOutstanding += balance;
      clientOutstandingMap[orgName].invoicesCount += 1;
      if (isOverdue) {
        clientOutstandingMap[orgName].overdueCount += 1;
      }

      // Payment Aging Calculation
      // Categorize based on how long it has been overdue (or 0-30 days bucket for upcoming/recent)
      if (overdueDays <= 30) {
        agingBuckets.currentOr0to30.amount += balance;
        agingBuckets.currentOr0to30.count += 1;
        agingBuckets.currentOr0to30.invoices.push(invoiceItem);
      } else if (overdueDays <= 60) {
        agingBuckets.days31to60.amount += balance;
        agingBuckets.days31to60.count += 1;
        agingBuckets.days31to60.invoices.push(invoiceItem);
      } else if (overdueDays <= 90) {
        agingBuckets.days61to90.amount += balance;
        agingBuckets.days61to90.count += 1;
        agingBuckets.days61to90.invoices.push(invoiceItem);
      } else {
        agingBuckets.days90Plus.amount += balance;
        agingBuckets.days90Plus.count += 1;
        agingBuckets.days90Plus.invoices.push(invoiceItem);
      }
    }

    const clientOutstandingList = Object.values(clientOutstandingMap)
      .map((item) => ({
        ...item,
        percentage:
          totalPendingPayments > 0
            ? Number(((item.totalOutstanding / totalPendingPayments) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const agingList = [
      {
        key: "0-30",
        label: "0–30 Days",
        amount: agingBuckets.currentOr0to30.amount,
        count: agingBuckets.currentOr0to30.count,
        percentage:
          totalPendingPayments > 0
            ? Number(((agingBuckets.currentOr0to30.amount / totalPendingPayments) * 100).toFixed(1))
            : 0,
      },
      {
        key: "31-60",
        label: "31–60 Days",
        amount: agingBuckets.days31to60.amount,
        count: agingBuckets.days31to60.count,
        percentage:
          totalPendingPayments > 0
            ? Number(((agingBuckets.days31to60.amount / totalPendingPayments) * 100).toFixed(1))
            : 0,
      },
      {
        key: "61-90",
        label: "61–90 Days",
        amount: agingBuckets.days61to90.amount,
        count: agingBuckets.days61to90.count,
        percentage:
          totalPendingPayments > 0
            ? Number(((agingBuckets.days61to90.amount / totalPendingPayments) * 100).toFixed(1))
            : 0,
      },
      {
        key: "90+",
        label: "90+ Days",
        amount: agingBuckets.days90Plus.amount,
        count: agingBuckets.days90Plus.count,
        percentage:
          totalPendingPayments > 0
            ? Number(((agingBuckets.days90Plus.amount / totalPendingPayments) * 100).toFixed(1))
            : 0,
      },
    ];

    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
    const totalPartialAmount = partiallyPaidInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPendingPayments,
          totalInvoicesCount: invoices.length,
          overdueCount: overdueInvoices.length,
          totalOverdueAmount,
          partialCount: partiallyPaidInvoices.length,
          totalPartialAmount,
        },
        agingList,
        clientWiseOutstanding: clientOutstandingList,
        overdueInvoices,
        partiallyPaidInvoices,
      },
    });
  } catch (error) {
    console.error("Error generating outstanding report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate outstanding payments report",
      error: error.message,
    });
  }
};
