import os
import sys

try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    BackgroundScheduler = None

from main.modules.code_descriptions.service import CodeDescriptionService

_scheduler = None


def start_code_description_scheduler(app):
    global _scheduler
    if BackgroundScheduler is None:
        app.logger.warning("APScheduler is not installed; code description extraction scheduler is disabled.")
        return
    if "db" in sys.argv:
        return
    if _scheduler and _scheduler.running:
        return
    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    def run_with_context(code_type):
        with app.app_context():
            CodeDescriptionService.run_extraction(code_type, run_label="Scheduled")

    scheduler.add_job(
        run_with_context,
        "cron",
        args=["remark"],
        day="1-7,15-21",
        day_of_week="mon",
        hour=10,
        minute=0,
        id="biweekly_remark_code_description_extraction",
        replace_existing=True,
    )
    scheduler.add_job(
        run_with_context,
        "cron",
        args=["reason"],
        day="1-7,15-21",
        day_of_week="mon",
        hour=10,
        minute=15,
        id="biweekly_reason_code_description_extraction",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
