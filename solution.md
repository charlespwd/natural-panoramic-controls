For those of you who can make do with an approximate solution. I found
one using small-angle approximations and Euler angles.

First, $T_{w \leftarrow c}$ can be expressed using [Tait-Bryan angles][1] in the
$YXZ$ order (yaw about $y$, pitch about $x'$, roll about $z^{\prime\prime}$).

In this order, condition (2) (maitaining the up direction) can be respected if we
restrict the roll angle to $0$.

For $\theta$ is the yaw angle about the $y$ axis and $\phi$ is the pitch angle
about the $x'$ axis, the corresponding transformation matrix is the following:

\begin{equation}
T_{w \leftarrow c} =
\begin{bmatrix}
  C_{\theta} & S_\theta S_\phi & S_\theta C_\phi \\
  0          & C_\phi          & - S_\phi        \\
  -S_\theta  & C_\theta S_\phi & C_\theta C_\phi
\end{bmatrix}
\end{equation}

But because the notation is getting tedious, from now on

\begin{equation}
T       = T_{w\leftarrow c} \\
p_{1_c} = p_{i_{camera}}    \\
p_{2_c} = p_{f_{camera}}    \\
p_w     = p_{world}.
\end{equation}

Recalling condition (1),

\begin{equation} \label{eq:T}
p_w = T_2 p_{2_c} = T_1 p_{1_c}
\end{equation}

Now, since we both know $p_{1_c}$ (the corresponding mouse position at the last
frame) and $p_{2_c}$ (the mouse position at the current frame). We know that

\begin{equation} \label{eq:d}
p_{1_c} = D p_{2_c}
\end{equation}

And thus,

\begin{equation}
T_2 p_{2_c} = T_1 D p_{2_c} \\
\Rightarrow T_2 = T_1 D \\
\end{equation}

Great! If I can solve (or approximate) $D$, I can find $T_2$!

Since $p_{1_c}$ and $p_{2_c}$ are "not far away" from each other. We can assume
that they are some small $\Delta \theta$ and small $\Delta \phi$ away from one
another.

\begin{equation}
D =
\begin{bmatrix}
  C_{\Delta\theta}  & S_{\Delta\theta} S_{\Delta\phi} & S_{\Delta\theta} C_{\Delta\phi} \\
  0                 & C_{\Delta\phi}                  & - S_{\Delta\phi}                \\
  -S_{\Delta\theta} & C_{\Delta\theta} S_{\Delta\phi} & C_{\Delta\theta} C_{\Delta\phi}
\end{bmatrix}
\end{equation}

Using [small-angle approximations][2], we know

$$
\sin x \approx x \\
\cos x \approx 1 - \frac{x^2}{2}
$$

Knowing this and $p_{1_c} = D p_{2_c}$, we can get second degree polynomial
equations for $\Delta\theta$ and $\Delta\phi$. In fact, from the second row of
the matrix, we find that

$$
0 = - \frac{y_2}{2} \Delta\phi^2 -z_2 \Delta\phi + (y_2 - y_1) \\
$$

For which we can find two solutions. We will choose the one that respects the
small-angle assumption.

$$
\Delta\phi = \frac{-b \pm \sqrt{b^2 - 4 a c}}{2a} 
$$

And finally, from the first row of the matrix we get,

$$
0 = - \frac{x_2}{2} \Delta\theta^2 - (\Delta\phi y_2 + z_2 ( 1 - \frac{\Delta\phi ^2}{2})) \Delta\theta + (x2 - x1)
$$

For which we can find two solutions. And by choosing the one that respects the
small-angle assumption, we have successfully approximated $D$!

$$
\Delta\theta = \frac{-b \pm \sqrt{b^2 - 4 a c}}{2a} 
$$

Now that $D$ is approximated, we can calculate $T_2$ by adding $\Delta\theta$
and $\Delta\phi$ to the angles of $T_1$.

We're done!

[1]: https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix
[2]: https://en.wikipedia.org/wiki/Small-angle_approximation
