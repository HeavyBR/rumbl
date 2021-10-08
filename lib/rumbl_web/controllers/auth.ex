defmodule RumblWeb.Auth do
  @moduledoc """
    RumblWeb.Auth is the module responsible for authentication.
  """


  import Plug.Conn
  import Phoenix.Controller
  alias RumblWeb.Router.Helpers, as: Routes

  @doc """
    authenticate_user verifies if the provided Plug.Conn has an assign that represents the logged user.
    If the current_user is present on the Plug.Conn assigns, so the user is authenticated.
    For authenticated connections the function returns the Conn
    For unauthenticated connections the function halts the Conn and stops the pipeline.
  """
  def authenticate_user(conn, _opts) do
    if conn.assigns.current_user do
      conn
    else
      conn
      |> put_flash(:error, "You must be logged in to access that page")
      |> redirect(to: Routes.page_path(conn, :index))
      |> halt()
    end
  end

  def init(opts), do: opts

  @doc """
    call is a Plug that take the user_id from the session, bring the user from the database and assign it to the current_user.
  """
  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)
    user = user_id && Rumbl.Accounts.get_user(user_id)
    assign(conn, :current_user, user)
  end

  @doc """
    login is a Plug that assign the current_user to the session and configures a new session to the user.
  """
  def login(conn, user) do
    conn
    |> assign(:current_user, user)
    |> put_session(:user_id, user.id)
    |> configure_session(renew: true)
  end

  def logout(conn) do
    configure_session(conn, drop: true)
  end
end
