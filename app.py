import json
import threading
import time
import tkinter as tk
from dataclasses import dataclass, field
from tkinter import messagebox, ttk

from updater import UpdateResult, check_for_updates

APP_NAME = "Business Automation Suite"
APP_VERSION = "1.0.0"
GITHUB_REPO = "your-org/business-automation-suite"


@dataclass
class InventoryItem:
    sku: str
    name: str
    quantity: int
    reorder_point: int
    usage_per_tick: int

    @property
    def needs_reorder(self) -> bool:
        return self.quantity <= self.reorder_point


@dataclass
class WorkOrder:
    order_id: str
    customer: str
    stage: str
    due_date: str


@dataclass
class AttendanceRecord:
    employee: str
    status: str
    hours_today: float


@dataclass
class AppState:
    inventory: list[InventoryItem] = field(default_factory=list)
    work_orders: list[WorkOrder] = field(default_factory=list)
    attendance: list[AttendanceRecord] = field(default_factory=list)


class BusinessAutomationApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_NAME} v{APP_VERSION}")
        self.geometry("1100x760")
        self.minsize(1000, 700)

        self.state = AppState(
            inventory=[
                InventoryItem("INV-101", "Aluminium Sheets", 88, 40, 2),
                InventoryItem("INV-102", "Hydraulic Pumps", 24, 15, 1),
                InventoryItem("INV-103", "Electrical Harness", 55, 25, 3),
                InventoryItem("INV-104", "Safety Gloves", 140, 70, 5),
            ],
            work_orders=[
                WorkOrder("WO-521", "Pioneer Farms", "Lead", "2026-03-02"),
                WorkOrder("WO-522", "City Builders", "In Progress", "2026-03-08"),
                WorkOrder("WO-523", "Red River Co-op", "QA", "2026-03-04"),
                WorkOrder("WO-524", "Autumn Logistics", "Delivery", "2026-03-06"),
            ],
            attendance=[
                AttendanceRecord("Anika Singh", "Clocked In", 6.0),
                AttendanceRecord("Jordan Lee", "Clocked In", 5.5),
                AttendanceRecord("Maria Gomez", "On Leave", 0.0),
                AttendanceRecord("Tyrell James", "Clocked Out", 8.2),
            ],
        )

        self._build_layout()
        self._start_realtime_updates()

    def _build_layout(self) -> None:
        container = ttk.Frame(self, padding=16)
        container.pack(fill=tk.BOTH, expand=True)

        heading = ttk.Frame(container)
        heading.pack(fill=tk.X)

        title = ttk.Label(
            heading,
            text=APP_NAME,
            font=("Segoe UI", 20, "bold"),
        )
        title.pack(side=tk.LEFT)

        subtitle = ttk.Label(
            heading,
            text="Automation for inventory, attendance, and work orders",
            font=("Segoe UI", 11),
        )
        subtitle.pack(side=tk.LEFT, padx=16, pady=(8, 0))

        update_btn = ttk.Button(heading, text="Check for Updates", command=self.on_check_updates)
        update_btn.pack(side=tk.RIGHT)

        self.status_var = tk.StringVar(value="System healthy. Realtime tracking is active.")
        status_label = ttk.Label(container, textvariable=self.status_var, foreground="#1f5f20")
        status_label.pack(anchor="w", pady=(8, 12))

        notebook = ttk.Notebook(container)
        notebook.pack(fill=tk.BOTH, expand=True)

        self.dashboard_tab = ttk.Frame(notebook)
        self.inventory_tab = ttk.Frame(notebook)
        self.attendance_tab = ttk.Frame(notebook)
        self.work_order_tab = ttk.Frame(notebook)
        self.workflows_tab = ttk.Frame(notebook)
        self.expertise_tab = ttk.Frame(notebook)

        notebook.add(self.dashboard_tab, text="Smart Dashboards")
        notebook.add(self.inventory_tab, text="Inventory Control")
        notebook.add(self.attendance_tab, text="Staff Attendance")
        notebook.add(self.work_order_tab, text="Work Order Tracking")
        notebook.add(self.workflows_tab, text="Custom Workflows")
        notebook.add(self.expertise_tab, text="Local Expertise")

        self._build_dashboard_tab()
        self._build_inventory_tab()
        self._build_attendance_tab()
        self._build_work_order_tab()
        self._build_workflows_tab()
        self._build_expertise_tab()

    def _build_dashboard_tab(self) -> None:
        frame = ttk.Frame(self.dashboard_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        cards = ttk.Frame(frame)
        cards.pack(fill=tk.X)

        self.kpi_inventory = self._kpi_card(cards, "Inventory Health", "-")
        self.kpi_attendance = self._kpi_card(cards, "Attendance Today", "-")
        self.kpi_workorders = self._kpi_card(cards, "Active Work Orders", "-")

        self.kpi_inventory.grid(row=0, column=0, padx=8, sticky="nsew")
        self.kpi_attendance.grid(row=0, column=1, padx=8, sticky="nsew")
        self.kpi_workorders.grid(row=0, column=2, padx=8, sticky="nsew")

        for i in range(3):
            cards.columnconfigure(i, weight=1)

        chart_frame = ttk.LabelFrame(frame, text="Performance Snapshot", padding=10)
        chart_frame.pack(fill=tk.BOTH, expand=True, pady=(16, 0))

        self.canvas = tk.Canvas(chart_frame, height=240, bg="white", highlightthickness=1, highlightbackground="#d0d0d0")
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self._refresh_dashboard()

    def _kpi_card(self, parent: ttk.Frame, title: str, value: str) -> ttk.LabelFrame:
        card = ttk.LabelFrame(parent, text=title, padding=12)
        label = ttk.Label(card, text=value, font=("Segoe UI", 18, "bold"))
        label.pack(anchor="w")
        card.value_label = label
        return card

    def _build_inventory_tab(self) -> None:
        frame = ttk.Frame(self.inventory_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        cols = ("sku", "name", "quantity", "reorder_point", "status")
        self.inventory_tree = ttk.Treeview(frame, columns=cols, show="headings", height=15)
        for col in cols:
            self.inventory_tree.heading(col, text=col.replace("_", " ").title())
        self.inventory_tree.column("name", width=280)
        self.inventory_tree.pack(fill=tk.BOTH, expand=True)

        self.reorder_var = tk.StringVar()
        ttk.Label(frame, textvariable=self.reorder_var, foreground="#8a2f2f").pack(anchor="w", pady=(8, 0))

        self._refresh_inventory_tree()

    def _build_attendance_tab(self) -> None:
        frame = ttk.Frame(self.attendance_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        cols = ("employee", "status", "hours_today")
        self.attendance_tree = ttk.Treeview(frame, columns=cols, show="headings", height=15)
        for col in cols:
            self.attendance_tree.heading(col, text=col.replace("_", " ").title())
        self.attendance_tree.column("employee", width=280)
        self.attendance_tree.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            frame,
            text="Automated attendance data is ready for payroll exports and audit logs.",
            font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(8, 0))

        self._refresh_attendance_tree()

    def _build_work_order_tab(self) -> None:
        frame = ttk.Frame(self.work_order_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        cols = ("order_id", "customer", "stage", "due_date")
        self.work_order_tree = ttk.Treeview(frame, columns=cols, show="headings", height=15)
        for col in cols:
            self.work_order_tree.heading(col, text=col.replace("_", " ").title())
        self.work_order_tree.column("customer", width=260)
        self.work_order_tree.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            frame,
            text="Every job is visible from lead to delivery with due-date accountability.",
            font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(8, 0))

        self._refresh_work_orders()

    def _build_workflows_tab(self) -> None:
        frame = ttk.Frame(self.workflows_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        desc = (
            "Have a unique bottleneck? Define your own rules:\n\n"
            "• Trigger actions from sales emails or form submissions\n"
            "• Auto-assign field teams based on availability\n"
            "• Route approvals with full change history\n"
            "• Sync data between spreadsheets, CRM, and ERP systems\n"
            "• Build custom alerts for SLA and compliance deadlines"
        )
        ttk.Label(frame, text=desc, justify=tk.LEFT, font=("Segoe UI", 11)).pack(anchor="w")

    def _build_expertise_tab(self) -> None:
        frame = ttk.Frame(self.expertise_tab, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        text = (
            "Local Expertise\n\n"
            "Get your systems up and running in days, not months.\n"
            "You get direct support from Neil for setup, training, and optimization.\n\n"
            "Need help now?\n"
            "Email: neil@example.com\n"
            "Phone: +1 (555) 010-0199"
        )
        ttk.Label(frame, text=text, font=("Segoe UI", 12), justify=tk.LEFT).pack(anchor="w")

    def _refresh_dashboard(self) -> None:
        total_items = sum(item.quantity for item in self.state.inventory)
        reorder_count = sum(1 for item in self.state.inventory if item.needs_reorder)
        present_count = sum(1 for record in self.state.attendance if record.status == "Clocked In")
        active_work_orders = sum(1 for order in self.state.work_orders if order.stage != "Delivery")

        self.kpi_inventory.value_label.config(text=f"{total_items} units | {reorder_count} low")
        self.kpi_attendance.value_label.config(text=f"{present_count}/{len(self.state.attendance)} clocked in")
        self.kpi_workorders.value_label.config(text=f"{active_work_orders} active")

        self._draw_chart(total_items, present_count, active_work_orders)

    def _draw_chart(self, inventory: int, attendance: int, workorders: int) -> None:
        self.canvas.delete("all")
        metrics = [
            ("Inventory", inventory, "#4e79a7"),
            ("Staff In", attendance * 25, "#59a14f"),
            ("Work Orders", workorders * 30, "#f28e2b"),
        ]
        max_value = max(v for _, v, _ in metrics) or 1

        width = self.canvas.winfo_width() or 800
        height = self.canvas.winfo_height() or 240
        chart_bottom = height - 35
        bar_width = width // (len(metrics) * 2)

        for idx, (label, value, color) in enumerate(metrics):
            x1 = (idx * 2 + 1) * bar_width
            x2 = x1 + bar_width
            bar_height = int((value / max_value) * (chart_bottom - 20))
            y1 = chart_bottom - bar_height
            self.canvas.create_rectangle(x1, y1, x2, chart_bottom, fill=color, outline="")
            self.canvas.create_text((x1 + x2) // 2, chart_bottom + 14, text=label)
            self.canvas.create_text((x1 + x2) // 2, y1 - 10, text=str(value))

    def _refresh_inventory_tree(self) -> None:
        for row in self.inventory_tree.get_children():
            self.inventory_tree.delete(row)

        reorder_list = []
        for item in self.state.inventory:
            status = "Reorder" if item.needs_reorder else "Healthy"
            self.inventory_tree.insert("", tk.END, values=(item.sku, item.name, item.quantity, item.reorder_point, status))
            if item.needs_reorder:
                reorder_list.append(f"{item.name} ({item.quantity})")

        if reorder_list:
            self.reorder_var.set("Automatic reorder suggested for: " + ", ".join(reorder_list))
            self.status_var.set("Attention: Some inventory items reached reorder points.")
        else:
            self.reorder_var.set("No reorder actions required.")
            self.status_var.set("System healthy. Realtime tracking is active.")

    def _refresh_attendance_tree(self) -> None:
        for row in self.attendance_tree.get_children():
            self.attendance_tree.delete(row)

        for record in self.state.attendance:
            self.attendance_tree.insert(
                "",
                tk.END,
                values=(record.employee, record.status, f"{record.hours_today:.1f}"),
            )

    def _refresh_work_orders(self) -> None:
        for row in self.work_order_tree.get_children():
            self.work_order_tree.delete(row)

        for order in self.state.work_orders:
            self.work_order_tree.insert("", tk.END, values=(order.order_id, order.customer, order.stage, order.due_date))

    def _start_realtime_updates(self) -> None:
        def tick() -> None:
            while True:
                time.sleep(3)
                for item in self.state.inventory:
                    item.quantity = max(0, item.quantity - item.usage_per_tick)

                self.after(0, self._refresh_inventory_tree)
                self.after(0, self._refresh_dashboard)

        thread = threading.Thread(target=tick, daemon=True)
        thread.start()

    def on_check_updates(self) -> None:
        self.status_var.set("Checking for updates from GitHub...")

        def run_check() -> None:
            try:
                result = check_for_updates(current_version=APP_VERSION, repo=GITHUB_REPO)
            except Exception as exc:
                self.after(0, lambda: self._show_update_error(exc))
                return
            self.after(0, lambda: self._handle_update_result(result))

        threading.Thread(target=run_check, daemon=True).start()

    def _show_update_error(self, error: Exception) -> None:
        self.status_var.set("Update check failed.")
        messagebox.showerror(
            "Update Error",
            f"Could not check for updates.\n\nReason: {error}",
        )

    def _handle_update_result(self, result: UpdateResult) -> None:
        if result.update_available:
            self.status_var.set(f"Update available: {result.latest_version}")
            open_update = messagebox.askyesno(
                "Update Available",
                "A newer version is available.\n\n"
                f"Current: {APP_VERSION}\n"
                f"Latest: {result.latest_version}\n\n"
                "Open secure GitHub release page now?",
            )
            if open_update and result.release_url:
                import webbrowser

                webbrowser.open(result.release_url)
        else:
            self.status_var.set("You are on the latest version.")
            messagebox.showinfo("No Updates", "You already have the latest version installed.")


def main() -> None:
    app = BusinessAutomationApp()
    app.mainloop()


if __name__ == "__main__":
    main()
