# Register all ORM models with Base.metadata before the session-scoped
# create_tables fixture calls Base.metadata.create_all().
# Without this, running only tests/unit/ in isolation would fail because
# no module-level code imports the models to trigger their registration.
import models.exercise       # noqa: F401
import models.scan_result    # noqa: F401
import models.user           # noqa: F401
import models.user_exercise  # noqa: F401
import models.water_log      # noqa: F401
