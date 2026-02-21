"use client";

import { useState } from "react";
import {
    Search,
    Filter,
    Download,
    MoreVertical,
    Ban,
    ArrowUpRight,
    CheckCircle2,
    XCircle,
    Clock,
    Book,
    Receipt,
    User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { voidPayment } from "./finance-actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface FinanceLedgerClientProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialLedger: any[];
}

export default function FinanceLedgerClient({
    initialLedger,
}: FinanceLedgerClientProps) {
    const [ledger, setLedger] = useState(initialLedger);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    async function handleVoid(id: string) {
        const reason = prompt(
            "Are you sure you want to void this payment? Please provide a reason:",
        );
        if (!reason) return;

        try {
            await voidPayment(id, reason);
            setLedger((prev) =>
                prev.map((p) =>
                    p.id === id
                        ? { ...p, status: "void", note: `VOIDED: ${reason}` }
                        : p,
                ),
            );
            toast({ title: "Payment Voided" });
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        }
    }

    const filteredLedger = ledger.filter(
        (p) =>
            p.registration.fullName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            p.receiptReference
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            p.registration.registerId
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
    );

    function handleExport() {
        if (filteredLedger.length === 0) return;

        const headers = [
            "Transaction ID",
            "Student Name",
            "Registration ID",
            "Program",
            "Date",
            "Method",
            "Reference",
            "Amount",
            "Status",
            "Remark",
        ];

        const csvData = filteredLedger.map((p) => [
            p.id.toString(),
            `"${p.registration.fullName.replace(/"/g, '""')}"`,
            p.registration.registerId,
            p.registration.programId,
            new Date(p.paymentDate).toLocaleDateString(),
            p.paymentMethod,
            p.receiptReference || "N/A",
            parseFloat(p.amount).toString(),
            p.status,
            `"${(p.note || "").replace(/"/g, '""')}"`,
        ]);

        const csvContent = [headers, ...csvData]
            .map((row) => row.join(","))
            .join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `finance_ledger_${new Date().toISOString().split("T")[0]}.csv`,
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by student, ID, or reference..."
                        className="pl-10 bg-white/50 backdrop-blur-sm border-white/60 rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl border-white/60 bg-white/40 hover:bg-white/60"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="rounded-xl border-white/60 bg-white/40 hover:bg-white/60"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-white/60 hover:bg-transparent">
                            <TableHead className="w-16 text-[10px] font-black uppercase text-gray-500 tracking-widest pl-6">
                                ID
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-4">
                                Student & Program
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-4">
                                Date & Method
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-4">
                                Reference
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-widest text-right px-4">
                                Amount
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-widest text-center px-4">
                                Status
                            </TableHead>
                            <TableHead className="w-[80px] pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence mode="popLayout">
                            {filteredLedger.map((payment) => (
                                <motion.tr
                                    key={payment.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="border-white/40 group hover:bg-white/40 transition-colors"
                                >
                                    <TableCell className="pl-6 py-4 font-mono text-xs text-gray-400">
                                        #{payment.id.toString().slice(-4)}
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <Link
                                            href={`/admin/registrations/${payment.ccaRegistrationId}`}
                                            className="group/link block"
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-primary-500" />
                                                <p className="font-bold text-gray-900 group-hover/link:text-primary transition-colors">
                                                    {
                                                        payment.registration
                                                            .fullName
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Book className="w-3 h-3 text-gray-400" />
                                                <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                                                    {
                                                        payment.registration
                                                            .programId
                                                    }
                                                </p>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                                            {new Date(
                                                payment.paymentDate,
                                            ).toLocaleDateString()}
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black mt-0.5 ml-5">
                                            {payment.paymentMethod}
                                        </p>
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                            {payment.receiptReference || "N/A"}
                                        </code>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-right">
                                        <p className="font-black text-gray-900 flex items-center justify-end gap-1">
                                            Rs.{" "}
                                            {parseFloat(
                                                payment.amount,
                                            ).toLocaleString()}
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        </p>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        {payment.status === "active" ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                PAID
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest">
                                                <XCircle className="w-3 h-3 mr-1" />
                                                VOIDED
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="pr-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-48 p-1 rounded-xl shadow-2xl border-white/60 bg-white/90 backdrop-blur-xl"
                                            >
                                                <DropdownMenuItem
                                                    asChild
                                                    className="rounded-lg"
                                                >
                                                    <Link
                                                        href={`/admin/registrations/${payment.ccaRegistrationId}`}
                                                    >
                                                        <User className="w-4 h-4 mr-2" />
                                                        View Student
                                                    </Link>
                                                </DropdownMenuItem>
                                                {payment.status !== "void" && (
                                                    <DropdownMenuItem
                                                        className="rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                                        onClick={() =>
                                                            handleVoid(
                                                                payment.id.toString(),
                                                            )
                                                        }
                                                    >
                                                        <Ban className="w-4 h-4 mr-2" />
                                                        Void Payment
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                </Table>

                {filteredLedger.length === 0 && (
                    <div className="text-center py-20 bg-white/40">
                        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-500">
                            No transactions found
                        </h3>
                        <p className="text-gray-400">
                            Try adjusting your search filters.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
